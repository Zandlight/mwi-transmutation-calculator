import React, { useState, useEffect, useContext } from 'react';
import TransmuteFromSelect from './components/TransmuteFromSelect';
import TransmuteFromDisplay from './components/TransmuteFromDisplay';
import TransmuteToSelect from './components/TransmuteToSelect';
import RequiredItemsDisplayComponent from './components/TransmuteToDisplay';
import ThemeSwitcher from './components/ThemeSwitcher';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import './App.css';
import './components/MaterialStyles.css';
import { ItemNumberInterval, calculateExpectedOutputByItemName, calculateRequiredTransmutations } from './utils/transmutationCalculator';
import InfoButton from './components/InfoButton';
import { getMatchedItem } from './utils/itemDetailDictParser';

const AppContent: React.FC = () => {
    // State for transmutation item, target item, alpha level, and results
    const [transmutationItem, setTransmutationItem] = useState<string>('');
    const [transmutationQuantity, setTransmutationQuantity] = useState<number>(1);
    const [alphaLevel, setAlphaLevel] = useState<number>(0.05);
    const [level, setLevel] = useState<number>(100);
    const [catalyticTea, setCatalyticTea] = useState<boolean>(false);
    const [catalyst, setCatalyst] = useState<boolean>(false);
    const [primeCatalyst, setPrimeCatalyst] = useState<boolean>(false);
    const [transmutationResults, setTransmutationResults] = useState<ItemNumberInterval[]>([]);
    const [requiredItemsResults, setRequiredItemsResults] = useState<ItemNumberInterval[]>([]);
    const [activeView, setActiveView] = useState<'transmuteFrom' | 'transmuteTo'>('transmuteFrom');
    const [itemNotFoundError, setItemNotFoundError] = useState<string>('');
    const { theme } = useContext(ThemeContext);

    // Add this effect to apply theme to body element
    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const handleViewToggle = (selectionView: 'transmuteFrom' | 'transmuteTo') => {
        setActiveView(selectionView);
    };

    function handleSubmit(itemName: string, quantity: number, alpha: string, itemLevel: number, tea: boolean, cat: boolean, primeCat: boolean) {
        const matchedItem = getMatchedItem(itemName);
        if (matchedItem && quantity > 0) {
            setTransmutationItem(itemName);
            setTransmutationQuantity(quantity);
            setAlphaLevel(parseFloat(alpha));
            setLevel(itemLevel);
            setCatalyticTea(tea);
            setCatalyst(cat);
            setPrimeCatalyst(primeCat);
            setItemNotFoundError(''); // Clear any existing error
        } else {
            setItemNotFoundError("Item not found. Please try again");
        }
    }

    // Calculate results whenever inputs change
    useEffect(() => {
        const calculateFunction = activeView === 'transmuteFrom'
            ? calculateExpectedOutputByItemName : calculateRequiredTransmutations;
        const setResults = activeView === 'transmuteFrom'
            ? setTransmutationResults : setRequiredItemsResults;
        const matchedItem = getMatchedItem(transmutationItem);
        if (matchedItem) {
            // Clear any previous error
            setItemNotFoundError('');
            if (transmutationItem != matchedItem) {
                setTransmutationItem(matchedItem);
            }
            // Calculate what items can be created with current inventory
            const transResults = calculateFunction(
                matchedItem,
                transmutationQuantity,
                alphaLevel,
                level,
                catalyticTea,
                catalyst,
                primeCatalyst
            );
            setResults(transResults);
        }
    }, [transmutationItem, transmutationQuantity, alphaLevel, level, catalyticTea, catalyst, primeCatalyst, activeView]);

    return (
        <div className={`app-container ${theme}`}>
            <header className="app-header">
                <h1>MWI Transmutation Calculator</h1>
                <ThemeSwitcher />
            </header>
            <main className="app-content">
                <div className={`content-section material-card ${theme}`}>
                    <div className="selection-header">
                        <h2>Item Selection</h2>
                        <div className="view-toggle">
                            <button
                                className={activeView === 'transmuteFrom' ? 'active' : ''}
                                onClick={() => handleViewToggle('transmuteFrom')}
                            >
                                Transmute From
                                <InfoButton
                                        content={
                                            <div>
                                                <p>
                                                    Given an input item to transmute and relevant data, see data about
                                                    the output of the transmutation.
                                                </p>
                                            </div>
                                        }
                                        position="bottom"
                                />
                            </button>
                            <button
                                className={activeView === 'transmuteTo' ? 'active' : ''}
                                onClick={() => handleViewToggle('transmuteTo')}
                            >
                                Transmute To
                                <InfoButton
                                        content={
                                            <div>
                                                <p>
                                                    Given a target output item and relevant data, see data about the
                                                    input required to get that output.
                                                </p>
                                            </div>
                                        }
                                        position="bottom"
                                />
                            </button>
                        </div>
                    </div>

                    {activeView === 'transmuteFrom' ? (
                        <TransmuteFromSelect
                            onSubmit={handleSubmit}
                        />
                    ) : (
                        <TransmuteToSelect
                            onSubmit={handleSubmit}
                        />
                    )}

                    {itemNotFoundError && (
                        <div className="error-message">
                            {itemNotFoundError}
                        </div>
                    )}
                </div>

                {(transmutationResults.length > 0 || requiredItemsResults.length > 0) && (
                    <div className={`content-section material-card ${theme}`}>
                        <div className="results-header">
                            <h2>Results</h2>
                            {transmutationResults.length > 0 && requiredItemsResults.length > 0 && (
                                <div className="view-toggle">
                                    <button
                                        className={activeView === 'transmuteFrom' ? 'active' : ''}
                                        onClick={() => handleViewToggle('transmuteFrom')}
                                    >
                                        Transmutation Results
                                    </button>
                                    <button
                                        className={activeView === 'transmuteTo' ? 'active' : ''}
                                        onClick={() => handleViewToggle('transmuteTo')}
                                    >
                                        Required Items
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={`results-container ${theme}`}>
                            {activeView === 'transmuteFrom' && transmutationResults.length > 0 ? (
                                <TransmuteFromDisplay
                                    results={transmutationResults}
                                    transmutedItem={transmutationItem}
                                    quantity={transmutationQuantity}
                                />
                            ) : activeView === 'transmuteTo' && requiredItemsResults.length > 0 ? (
                                <RequiredItemsDisplayComponent
                                    results={requiredItemsResults}
                                    targetItem={transmutationItem}
                                    quantity={transmutationQuantity}
                                />
                            ) : null}
                        </div>
                    </div>
                )}
            </main>
            <footer className="app-footer">
                <p>© 2025 MWI Transmutation Calculator</p>
            </footer>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
};

export default App;
