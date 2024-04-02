const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const csvFilePath = path.join(__dirname, '..', 'data', 'original_snapshot_data.csv');
const jsonOutputPath = path.join(__dirname, 'fixtures', 'metrics.json');

const readCsvAndGenerateJson = () => {
    const metrics = [];
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => metrics.push(data))
        .on('end', () => {
            fs.writeFileSync(jsonOutputPath, JSON.stringify(metrics, null, 2));
            console.log(`Metrics JSON generated at: ${jsonOutputPath}`);
        });
};

readCsvAndGenerateJson();