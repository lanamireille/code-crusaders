const REQUIRED_HEADERS = [
  'Note', 'Quantity', 'Total Tax Amount', 'Price',
  'Base Quantity', 'Unit Code', 'Item ID',
  'Description', 'Name', 'Properties'
];

/**
 * determines whether given csv is in the right format
 * @param {string} csvContent - csv content as a string
 * @returns {Object} an object indicating whether the CSV is valid:
 *                   - `valid` (boolean): true if the CSV is valid, false otherwise.
 */
export const validateCSV = (csvContent) => {
  const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row.length > 0);
  const headers = rows[0].split(',').map(header => header.trim());

  const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    return { valid: false, error: `Missing headers: ${missingHeaders.join(', ')}` };
  }

  for (let i = 1; i < rows.length; i++) {
    const columns = rows[i].split(',').map(col => col.trim());
    if (columns.length !== REQUIRED_HEADERS.length) {
      return { valid: false, error: `Row ${i} has incorrect number of columns.` };
    }
    if (columns.some(col => col === '')) {
      return { valid: false, error: `Row ${i} has empty columns.` };
    }
  }

  return { valid: true };
};
