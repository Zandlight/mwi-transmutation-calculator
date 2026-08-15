import { itemNameToKey, getDropTable, itemKeyToName, getItemNameList, getItemListTransmutesInto, getItemAlchemyDetails, getRequiredLevel, getTransmuteBaseSuccessRate } from "./itemDetailDictParser";

// This file contains functions that perform calculations related to transmutation, including expected output and confidence intervals based on the input data.

export interface TransmutationDropEntry {
    itemHrid: string;
    dropRate: number;
    minCount: number;
    maxCount: number;
    minEliteTier: number;
}

export interface ItemNumberInterval {
    itemName: string,
    expectedOutput: number;
    confidenceInterval: [number, number];
}


/**
 * Calculates the expected output and confidence intervals for transmutation items
 * 
 * This function takes a list of possible transmutation drops, a quantity of transmutations to perform,
 * and a confidence level (alpha), then calculates the expected number of each drop item and
 * the confidence interval for those expectations based on a binomial distribution model.
 * 
 * @param drops - Array of possible transmutation outcomes with their drop rates
 * @param quantity - Number of transmutation attempts to calculate for
 * @param alpha - Confidence level parameter. Known values are 0.1, 0.05, 0.01, and 0.005.
 *           Any other presented values will be ignored and use the default is 0.05 (95% confidence)
 * @returns Array of transmutation results with expected output and confidence intervals for each drop
 */
export function calculateExpectedOutputByItemName(
    itemName: string,
    quantity: number,
    alpha: number = 0.05,
    level: number = 1,
    catalyticTea: boolean = false,
    catalyst: boolean = false,
    primeCatalyst: boolean = false,
): ItemNumberInterval[] {
    const itemKey = itemNameToKey(itemName);
    const alchemyDetails = getItemAlchemyDetails(itemKey);
    const drops: TransmutationDropEntry[] = alchemyDetails?.transmuteDropTable ?? [];
    const successChance = calculateSuccessChance(itemKey, level, catalyticTea, catalyst, primeCatalyst);

    if (!drops.length) {
        console.error(`No drop table found for item ${itemName}`);
    }

    return drops.map(drop => {
        const dropsPerSuccess = drop.minCount;
        const combinedChance = successChance * drop.dropRate;
        const expectedOutput = drop.dropRate * quantity * successChance * dropsPerSuccess;
        const itemName = itemKeyToName(drop.itemHrid);
        // Standard deviation for Binomial distribution: sqrt(np(1-p))
        const stdDev = Math.sqrt(quantity * dropsPerSuccess * combinedChance * (1 - combinedChance));
        
        // If alpha is not one of the accepted (known) values, default to 0.05
        alpha = Object.keys(alphaToZScoreDict).includes(alpha.toString()) ? alpha : 0.05;
        const zScore = alphaToZScoreDict[alpha];

        let lowerBound = Math.max(0, expectedOutput - stdDev * zScore);
        let upperBound = Math.min(expectedOutput + stdDev * zScore, quantity * dropsPerSuccess);

        return {
            itemName,
            expectedOutput,
            confidenceInterval: [
                lowerBound,
                upperBound,
            ]
        };
    });
}

export function calculateRequiredTransmutations(
    targetItem: string,
    targetQuantity: number,
    alpha: number = 0.05,
    level: number = 1,
    catalyticTea: boolean = false,
    catalyst: boolean = false,
    primeCatalyst: boolean = false,
): ItemNumberInterval[] {
    const transmuteItems = getItemListTransmutesInto(targetItem);
    
    if (transmuteItems.length === 0) {
        console.error(`No items found that transmute into ${targetItem}`);
        return [];
    }
    
    return transmuteItems.map(itemName => {
        const itemKey = itemNameToKey(itemName);
        const drops: TransmutationDropEntry[] = getDropTable(itemKey);
        
        // Find the drop entry that matches our target item
        const targetDrop = drops.find(drop => itemKeyToName(drop.itemHrid) === targetItem);
        
        if (!targetDrop) {
            return {
                itemName,
                expectedOutput: Infinity,
                confidenceInterval: [Infinity, Infinity]
            };
        }
        
        // Calculate expected transmutations needed
        const dropChance = targetDrop.dropRate;
        // Different success modifier per item since the item levels are different
        // -> must be calculated in the map function
        const successChance = calculateSuccessChance(itemKey, level, catalyticTea, catalyst, primeCatalyst);
        const dropsPerSuccess = targetDrop.minCount;
        const combinedSuccess = dropChance * successChance;
        const expectedTransmutations = targetQuantity / dropsPerSuccess * (1 - combinedSuccess) / combinedSuccess;
        
        // Standard deviation for negative binomial distribution - modified to account for drops per success
        const stdDev = Math.sqrt(targetQuantity / dropsPerSuccess * (1 - combinedSuccess) / (combinedSuccess * combinedSuccess));
        
        // If alpha is not one of the accepted values, default to 0.05
        alpha = Object.keys(alphaToZScoreDict).includes(alpha.toString()) ? alpha : 0.05;
        const zScore = alphaToZScoreDict[alpha];
        
        return {
            itemName,
            expectedOutput: expectedTransmutations,
            confidenceInterval: [
                Math.max(1, expectedTransmutations - stdDev * zScore),
                expectedTransmutations + stdDev * zScore
            ]
        };
    });
}

export function confidenceIntervalPercentageToZScore(
    confidenceIntervalPercentage: number
): number {
    const alpha = 1 - confidenceIntervalPercentage / 100;
    const zScore = Math.sqrt(2) * erfcinv(alpha);
    return zScore;
}

/**
 * The erfcinv function is a numerical approximation of the inverse complementary error function.
 * It is used to calculate the z-score corresponding to a given confidence interval percentage.
 * The function takes a number x as input and returns the z-score.
 * The function uses the inverse complementary error function (erfcinv) to calculate the z-score.
 */
function erfcinv(x: number): number {
    if (x >= 2) {
        return -Math.sqrt(-Math.log((x - 1) / 2));
    }
    if (x <= 0) {
        return Math.sqrt(-Math.log(x / 2));
    }
    const a = 0.147;
    const y = Math.log((1 - x) / 2);
    const z = Math.sqrt(y * y - 4 * a * y);
    return Math.sqrt(z) - Math.sqrt(z + 4 * a);
}



const alphaToZScoreDict: {[alpha: number]: number} = {
    0.1: 1.645,
    0.05: 1.96,
    0.01: 2.576,
    0.005: 2.807
}

export function calculateSuccessModifier(
    itemKey: string,
    level: number = 1,
    catalyticTea: boolean = false,
    catalyst: boolean = false,
    primeCatalyst: boolean = false,
) {
    const itemLevel = getRequiredLevel(itemKey);

    const levelPenalty = Math.max(0, 0.9 - 0.9 * level / itemLevel);
    const levelMod = 1 - levelPenalty;

    const catalyticTeaMod = catalyticTea ? 1.05 : 1;
    const catalystMod = catalyst ? 1.15 : 1;
    const primeCatalystMod = primeCatalyst ? 1.25 : 1;

    return levelMod * catalyticTeaMod * catalystMod * primeCatalystMod;
}

export function calculateSuccessChance(
    itemKey: string,
    level: number = 1,
    catalyticTea: boolean = false,
    catalyst: boolean = false,
    primeCatalyst: boolean = false,
) {
    // Cap success chance at 90%
    const base = getTransmuteBaseSuccessRate(itemKey);
    const mod = calculateSuccessModifier(itemKey, level, catalyticTea, catalyst, primeCatalyst);
    return Math.min(
        0.9,
        base * mod
    );
}
