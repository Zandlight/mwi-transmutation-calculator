import React, { useContext, useState } from 'react';
import { ItemNumberInterval } from '../utils/transmutationCalculator';
import './MaterialStyles.css';
import { ThemeContext } from '../context/ThemeContext';

// Define the possible sort fields and directions
type SortField = 'itemName' | 'expectedOutput' | 'confidenceInterval';
type SortDirection = 'asc' | 'desc';

interface BaseResultsDisplayProps {
    results: ItemNumberInterval[];
    title: string;
    itemName?: string;
    quantity?: number;
    itemDescription: string;
    noResultsMessage: string;
    itemLabel: string;
    quantityLabel: string;
    intervalLabel: string;
    itemNamePrefix: string;
}

const BaseResultsDisplayComponent: React.FC<BaseResultsDisplayProps> = ({
    results,
    title,
    itemName,
    quantity,
    itemDescription,
    noResultsMessage,
    itemLabel,
    quantityLabel,
    intervalLabel,
    itemNamePrefix,
}) => {
    const { theme } = useContext(ThemeContext);
    const [sortField, setSortField] = useState<SortField>('expectedOutput');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Handle column sorting
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Toggle direction if same field clicked
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, default to ascending
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Get sorted results
    const getSortedResults = () => {
        return results.sort((a, b) => {
            const multiplier = sortDirection === 'asc' ? 1 : -1;
            
            switch (sortField) {
                case 'itemName':
                    return multiplier * a.itemName.localeCompare(b.itemName);
                case 'expectedOutput':
                    return multiplier * (a.expectedOutput - b.expectedOutput);
                case 'confidenceInterval':
                    // Sort by lower bound of confidence interval
                    return multiplier * (a.confidenceInterval[0] - b.confidenceInterval[0]);
                default:
                    return 0;
            }
        });
    };

    if (results.length === 0) {
        return <p className={theme}>{noResultsMessage}</p>;
    }

    return (
        <div className={theme}>
            <h3>{title}</h3>
            {itemName && (
                <p className={itemDescription}>
                    {itemNamePrefix} {itemName}{quantity && quantity > 1 ? ` x${quantity}` : ''}
                </p>
            )}
            <div className="table-container">                <table className={`material-table ${theme}`}>
                    <thead>
                        <tr>                            <th onClick={() => handleSort('itemName')} className="sortable-header">
                                {itemLabel}
                                <span className="sort-indicator">
                                    {sortField === 'itemName' && (sortDirection === 'asc' ? '▲' : '▼')}
                                </span>
                            </th>
                            <th onClick={() => handleSort('expectedOutput')} className="sortable-header">
                                {quantityLabel}
                                <span className="sort-indicator">
                                    {sortField === 'expectedOutput' && (sortDirection === 'asc' ? '▲' : '▼')}
                                </span>
                            </th>
                            <th onClick={() => handleSort('confidenceInterval')} className="sortable-header">
                                {intervalLabel}
                                <span className="sort-indicator">
                                    {sortField === 'confidenceInterval' && (sortDirection === 'asc' ? '▲' : '▼')}
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {getSortedResults().map((result, index) => (
                            <tr key={index}>
                                <td>{result.itemName}</td>
                                <td>{result.expectedOutput.toFixed(3)}</td>
                                <td>{result.confidenceInterval[0].toFixed(3)} - {result.confidenceInterval[1].toFixed(3)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BaseResultsDisplayComponent;
