/**
 * Import PBDB Data vào MongoDB
 * Sử dụng streaming để xử lý file lớn (2 triệu bản ghi)
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Fossil = require('../models/Fossil');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history';
const CSV_PATH = path.join(__dirname, '../../pbdb_data.csv');
const BATCH_SIZE = 5000; // Insert 5000 records at a time
// Mỗi lần import tối đa 500k (có thể set env IMPORT_MAX_RECORDS). 0 = không giới hạn.
const MAX_RECORDS = process.env.IMPORT_MAX_RECORDS
  ? parseInt(process.env.IMPORT_MAX_RECORDS, 10)
  : 500000;
// Bỏ qua N bản ghi đầu (để tiếp tục các lần sau). Lần 1: 0, lần 2: 500000, lần 3: 1000000, ...
const SKIP_RECORDS = process.env.IMPORT_SKIP
  ? parseInt(process.env.IMPORT_SKIP, 10)
  : 0;
// Chỉ xóa DB khi set IMPORT_CLEAR=1 (tránh xóa nhầm khi import tiếp).
const CLEAR_BEFORE_IMPORT = process.env.IMPORT_CLEAR === '1' || process.env.IMPORT_CLEAR === 'true';

// Map geological periods to eons and eras
const geologicalTimeMap = {
    // Cenozoic Era (66 Ma - present)
    'Quaternary': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 2.58, minMa: 0 },
    'Holocene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 0.0117, minMa: 0 },
    'Pleistocene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 2.58, minMa: 0.0117 },
    'Neogene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 23.03, minMa: 2.58 },
    'Pliocene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 5.33, minMa: 2.58 },
    'Miocene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 23.03, minMa: 5.33 },
    'Paleogene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 66, minMa: 23.03 },
    'Oligocene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 33.9, minMa: 23.03 },
    'Eocene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 56, minMa: 33.9 },
    'Paleocene': { eon: 'Phanerozoic', era: 'Cenozoic', maxMa: 66, minMa: 56 },
    
    // Mesozoic Era (252 - 66 Ma)
    'Cretaceous': { eon: 'Phanerozoic', era: 'Mesozoic', maxMa: 145, minMa: 66 },
    'Jurassic': { eon: 'Phanerozoic', era: 'Mesozoic', maxMa: 201.3, minMa: 145 },
    'Triassic': { eon: 'Phanerozoic', era: 'Mesozoic', maxMa: 251.9, minMa: 201.3 },
    
    // Paleozoic Era (538.8 - 252 Ma)
    'Permian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 298.9, minMa: 251.9 },
    'Carboniferous': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 358.9, minMa: 298.9 },
    'Pennsylvanian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 323.2, minMa: 298.9 },
    'Mississippian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 358.9, minMa: 323.2 },
    'Devonian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 419.2, minMa: 358.9 },
    'Silurian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 443.8, minMa: 419.2 },
    'Ordovician': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 485.4, minMa: 443.8 },
    'Cambrian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 538.8, minMa: 485.4 },
    
    // Carboniferous sub-periods (North America)
    'Morrowan': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 323.4, minMa: 318.6 },
    'Atokan': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 318.6, minMa: 311.7 },
    'Desmoinesian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 311.7, minMa: 306.5 },
    'Missourian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 306.5, minMa: 303.7 },
    'Virgilian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 303.7, minMa: 298.9 },
    'Kinderhookian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 358.9, minMa: 352.8 },
    'Osagean': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 352.8, minMa: 342.8 },
    'Meramecian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 342.8, minMa: 330.9 },
    'Chesterian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 330.9, minMa: 323.2 },
    
    // European Carboniferous stages
    'Tournaisian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 358.9, minMa: 346.7 },
    'Visean': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 346.7, minMa: 330.9 },
    'Serpukhovian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 330.9, minMa: 323.2 },
    'Bashkirian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 323.2, minMa: 315.2 },
    'Moscovian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 315.2, minMa: 307 },
    'Kasimovian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 307, minMa: 303.7 },
    'Gzhelian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 303.7, minMa: 298.9 },
    
    // Older stages
    'Ivorian': { eon: 'Phanerozoic', era: 'Paleozoic', maxMa: 353.7, minMa: 346.7 },
    
    // Proterozoic
    'Ediacaran': { eon: 'Proterozoic', era: 'Neoproterozoic', maxMa: 635, minMa: 538.8 },
    'Cryogenian': { eon: 'Proterozoic', era: 'Neoproterozoic', maxMa: 720, minMa: 635 },
    'Tonian': { eon: 'Proterozoic', era: 'Neoproterozoic', maxMa: 1000, minMa: 720 }
};

// Determine eon/era from maxMa
function getGeologicalTime(maxMa, earlyInterval) {
    // First try to match from interval name
    if (earlyInterval && geologicalTimeMap[earlyInterval]) {
        return geologicalTimeMap[earlyInterval];
    }
    
    // Otherwise determine from maxMa
    if (maxMa <= 66) {
        return { eon: 'Phanerozoic', era: 'Cenozoic', period: getPeriodFromMa(maxMa) };
    } else if (maxMa <= 252) {
        return { eon: 'Phanerozoic', era: 'Mesozoic', period: getPeriodFromMa(maxMa) };
    } else if (maxMa <= 538.8) {
        return { eon: 'Phanerozoic', era: 'Paleozoic', period: getPeriodFromMa(maxMa) };
    } else if (maxMa <= 2500) {
        return { eon: 'Proterozoic', era: 'Neoproterozoic', period: null };
    } else if (maxMa <= 4000) {
        return { eon: 'Archean', era: null, period: null };
    } else {
        return { eon: 'Hadean', era: null, period: null };
    }
}

function getPeriodFromMa(maxMa) {
    if (maxMa <= 2.58) return 'Quaternary';
    if (maxMa <= 23.03) return 'Neogene';
    if (maxMa <= 66) return 'Paleogene';
    if (maxMa <= 145) return 'Cretaceous';
    if (maxMa <= 201.3) return 'Jurassic';
    if (maxMa <= 251.9) return 'Triassic';
    if (maxMa <= 298.9) return 'Permian';
    if (maxMa <= 358.9) return 'Carboniferous';
    if (maxMa <= 419.2) return 'Devonian';
    if (maxMa <= 443.8) return 'Silurian';
    if (maxMa <= 485.4) return 'Ordovician';
    if (maxMa <= 538.8) return 'Cambrian';
    return null;
}

// Parse CSV line (handle quoted fields)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    
    return result;
}

// Convert row to Fossil document
function rowToFossil(row, headers) {
    const getValue = (key) => {
        const idx = headers.indexOf(key);
        return idx >= 0 ? row[idx] : null;
    };
    
    const maxMa = parseFloat(getValue('max_ma'));
    const minMa = parseFloat(getValue('min_ma'));
    const lng = parseFloat(getValue('lng'));
    const lat = parseFloat(getValue('lat'));
    const paleolng = parseFloat(getValue('paleolng'));
    const paleolat = parseFloat(getValue('paleolat'));
    const earlyInterval = getValue('early_interval');
    
    // Skip invalid records
    if (isNaN(maxMa) || isNaN(minMa) || isNaN(lng) || isNaN(lat)) {
        return null;
    }
    
    const geoTime = getGeologicalTime(maxMa, earlyInterval);
    
    return {
        occurrenceNo: parseInt(getValue('occurrence_no')) || 0,
        taxonomy: {
            acceptedName: getValue('accepted_name') || 'Unknown',
            acceptedRank: getValue('accepted_rank'),
            phylum: getValue('phylum') !== 'NO_PHYLUM_SPECIFIED' ? getValue('phylum') : null,
            class: getValue('class') !== 'NO_CLASS_SPECIFIED' ? getValue('class') : null,
            order: getValue('order') !== 'NO_ORDER_SPECIFIED' ? getValue('order') : null,
            family: getValue('family') !== 'NO_FAMILY_SPECIFIED' ? getValue('family') : null,
            genus: getValue('genus')
        },
        time: {
            earlyInterval: earlyInterval,
            lateInterval: getValue('late_interval'),
            maxMa: maxMa,
            minMa: minMa,
            timeBins: getValue('time_bins'),
            eon: geoTime.eon,
            era: geoTime.era,
            period: geoTime.period || getValue('time_major')
        },
        location: {
            lng: lng,
            lat: lat,
            country: getValue('cc'),
            state: getValue('state'),
            county: getValue('county'),
            collectionName: getValue('collection_name')
        },
        paleoLocation: {
            paleolng: isNaN(paleolng) ? null : paleolng,
            paleolat: isNaN(paleolat) ? null : paleolat,
            paleoAge: getValue('paleoage'),
            geoplate: parseInt(getValue('geoplate')) || null
        },
        geology: {
            formation: getValue('formation'),
            geologicalGroup: getValue('geological_group'),
            member: getValue('member'),
            lithology: getValue('lithology1'),
            environment: getValue('environment')
        },
        ecology: {
            taxonEnvironment: getValue('taxon_environment'),
            motility: getValue('motility'),
            lifeHabit: getValue('life_habit'),
            diet: getValue('diet')
        },
        abundance: {
            value: parseFloat(getValue('abund_value')) || null,
            unit: getValue('abund_unit')
        },
        reference: {
            author: getValue('ref_author'),
            year: parseInt(getValue('ref_pubyr')) || null,
            referenceNo: parseInt(getValue('reference_no')) || null
        }
    };
}

async function importPBDB() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     PBDB Data Import to MongoDB            ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');
        
        // Check if file exists
        if (!fs.existsSync(CSV_PATH)) {
            console.error('✗ File not found:', CSV_PATH);
            process.exit(1);
        }
        
        // Get file stats
        const stats = fs.statSync(CSV_PATH);
        console.log(`📁 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);
        
        // Chỉ xóa khi set IMPORT_CLEAR=1. Mặc định không xóa (import tiếp / append).
        const existingCount = await Fossil.countDocuments();
        if (existingCount > 0 && CLEAR_BEFORE_IMPORT) {
            console.log(`⚠ Found ${existingCount} existing records`);
            console.log('  Clearing (IMPORT_CLEAR=1)...');
            await Fossil.deleteMany({});
            console.log('✓ Cleared\n');
        } else if (existingCount > 0) {
            console.log(`📌 Append mode: ${existingCount.toLocaleString()} records in DB, skipping first ${SKIP_RECORDS.toLocaleString()} rows from file\n`);
        }
        
        // Create read stream
        const fileStream = fs.createReadStream(CSV_PATH, { encoding: 'utf8' });
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        
        let headers = null;
        let batch = [];
        let totalProcessed = 0;
        let totalImported = 0;
        let skippedMetadata = 0;
        let skippedInvalid = 0;
        let isDataSection = false;
        
        console.log('📊 Starting import...');
        if (SKIP_RECORDS > 0) console.log(`   Skip first: ${SKIP_RECORDS.toLocaleString()} | Max this run: ${MAX_RECORDS ? MAX_RECORDS.toLocaleString() : 'all'}`);
        console.log('');
        const startTime = Date.now();
        
        for await (const line of rl) {
            // Skip metadata lines at the beginning
            if (!isDataSection) {
                if (line.startsWith('"Records:"')) {
                    isDataSection = true;
                    skippedMetadata++;
                    continue;
                }
                skippedMetadata++;
                continue;
            }
            
            // First data line is headers
            if (!headers) {
                headers = parseCSVLine(line);
                console.log(`📋 Found ${headers.length} columns`);
                continue;
            }
            
            totalProcessed++;

            // Bỏ qua N bản ghi đầu (tiếp tục từ lần trước)
            if (totalProcessed <= SKIP_RECORDS) continue;

            // Parse row
            const row = parseCSVLine(line);
            const fossil = rowToFossil(row, headers);
            
            if (fossil) {
                batch.push(fossil);
            } else {
                skippedInvalid++;
            }
            
            // Insert batch
            if (batch.length >= BATCH_SIZE) {
                try {
                    await Fossil.insertMany(batch, { ordered: false });
                    totalImported += batch.length;
                } catch (err) {
                    // Handle duplicate key errors
                    if (err.writeErrors) {
                        totalImported += batch.length - err.writeErrors.length;
                    }
                }
                
                batch = [];
                
                // Progress report
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = Math.round(totalProcessed / elapsed);
                process.stdout.write(`\r  Processed: ${totalProcessed.toLocaleString()} | Imported: ${totalImported.toLocaleString()} | Rate: ${rate}/s    `);
            }
            
            // Check limit: đã import đủ MAX_RECORDS trong lần này (sau khi skip)
            const importedThisRun = totalProcessed - SKIP_RECORDS;
            if (MAX_RECORDS && importedThisRun >= MAX_RECORDS) {
                console.log(`\n\n⚠ Reached limit of ${MAX_RECORDS} records this run (processed ${totalProcessed.toLocaleString()} total)`);
                break;
            }
        }
        
        // Insert remaining batch
        if (batch.length > 0) {
            try {
                await Fossil.insertMany(batch, { ordered: false });
                totalImported += batch.length;
            } catch (err) {
                if (err.writeErrors) {
                    totalImported += batch.length - err.writeErrors.length;
                }
            }
        }
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        const importedThisRun = totalImported; // approximate (batch inserts)
        console.log('\n\n════════════════════════════════════════════');
        console.log('📊 Import Summary:');
        if (SKIP_RECORDS > 0) console.log(`   Records skipped (offset): ${SKIP_RECORDS.toLocaleString()}`);
        console.log(`   Metadata lines skipped: ${skippedMetadata}`);
        console.log(`   Records processed (file): ${totalProcessed.toLocaleString()}`);
        console.log(`   Records imported (this run): ${totalImported.toLocaleString()}`);
        console.log(`   Invalid records skipped: ${skippedInvalid.toLocaleString()}`);
        console.log(`   Time elapsed: ${elapsed}s`);
        console.log('════════════════════════════════════════════');
        
        // Create indexes
        console.log('\n📑 Creating indexes...');
        await Fossil.syncIndexes();
        console.log('✓ Indexes created');
        
        // Show statistics
        console.log('\n📈 Statistics by Era:');
        const eraStats = await Fossil.aggregate([
            { $group: { _id: '$time.era', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        eraStats.forEach(stat => {
            console.log(`   ${stat._id || 'Unknown'}: ${stat.count.toLocaleString()}`);
        });
        
        console.log('\n📈 Top 10 Phyla:');
        const phylaStats = await Fossil.aggregate([
            { $match: { 'taxonomy.phylum': { $ne: null } } },
            { $group: { _id: '$taxonomy.phylum', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        phylaStats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count.toLocaleString()}`);
        });
        
        console.log('\n✅ Import completed successfully!');
        
    } catch (error) {
        console.error('\n✗ Error:', error.message);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Disconnected from MongoDB');
    }
}

// Run import
importPBDB().catch(console.error);
