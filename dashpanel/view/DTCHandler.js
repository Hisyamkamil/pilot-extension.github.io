Ext.define('Store.dashpanel.view.DTCHandler', {
    singleton: true,
    
    /**
     * Parse DTC sensor value and return structured DTC data
     * @param {string} sensorValue - Format: 9D000301:01:01;9D000302:02:01
     * @returns {Array} Array of DTC objects with MCU, SPN, FMI, OC
     */
    parseDTCData: function(sensorValue) {
        var dtcList = [];
        
        if (!this.isValidDTCString(sensorValue)) {
            console.warn('Invalid DTC sensor value:', sensorValue);
            return dtcList;
        }
        
        var dtcEntries = sensorValue.split(';');
        console.log('Parsing', dtcEntries.length, 'DTC entries...');
        
        Ext.each(dtcEntries, function(entry) {
            var dtcData = this.parseSingleDTC(entry.trim());
            if (dtcData) {
                dtcList.push(dtcData);
            }
        }, this);
        
        console.log('✅ Parsed', dtcList.length, 'valid DTCs');
        return dtcList;
    },
    
    /**
     * Validate DTC string format
     * @param {string} sensorValue - The DTC sensor value
     * @returns {boolean} True if valid
     */
    isValidDTCString: function(sensorValue) {
        return sensorValue && 
               typeof sensorValue === 'string' && 
               sensorValue.length > 0;
    },
    
    /**
     * Parse single DTC entry
     * @param {string} dtcEntry - Format: 9D000301:01:01
     * @returns {Object|null} DTC object or null if invalid
     */
    parseSingleDTC: function(dtcEntry) {
        if (!dtcEntry) return null;
        
        var parts = dtcEntry.split(':');
        if (parts.length < 2) {
            console.warn('Invalid DTC format:', dtcEntry);
            return null;
        }
        
        var hexMessage = parts[0];
        var mcuSource = parts[1];
        
        if (!this.isValidHexMessage(hexMessage)) {
            console.warn('Invalid DTC hex format:', hexMessage);
            return null;
        }
        
        try {
            var dtcData = this.parseJ1939DTC(hexMessage);
            if (dtcData) {
                dtcData.mcuSource = parseInt(mcuSource, 10) || 0;
                dtcData.rawHex = hexMessage;
                return dtcData;
            }
        } catch (e) {
            console.error('Error parsing DTC:', dtcEntry, e);
        }
        
        return null;
    },
    
    /**
     * Validate hex message format
     * @param {string} hexMessage - 8-character hex string
     * @returns {boolean} True if valid
     */
    isValidHexMessage: function(hexMessage) {
        return hexMessage && 
               hexMessage.length === 8 && 
               /^[0-9A-Fa-f]{8}$/.test(hexMessage);
    },
    
    /**
     * Parse J1939-73 DTC hex message
     * @param {string} hexMessage - 8-character hex string (4 bytes)
     * @returns {Object} Parsed DTC data
     */
    parseJ1939DTC: function(hexMessage) {
        var bytes = this.hexToBytes(hexMessage);
        
        // Extract J1939-73 fields according to specification
        var spn = this.extractSPN(bytes);
        var fmi = this.extractFMI(bytes[2]);
        var oc = this.extractOC(bytes[3]);
        
        return {
            spn: spn,
            fmi: fmi,
            oc: oc,
            bytes: bytes
        };
    },
    
    /**
     * Convert hex string to byte array
     * @param {string} hexMessage - 8-character hex string
     * @returns {Array} Array of 4 bytes
     */
    hexToBytes: function(hexMessage) {
        return [
            parseInt(hexMessage.substr(0, 2), 16),  // Byte 1
            parseInt(hexMessage.substr(2, 2), 16),  // Byte 2
            parseInt(hexMessage.substr(4, 2), 16),  // Byte 3
            parseInt(hexMessage.substr(6, 2), 16)   // Byte 4
        ];
    },
    
    /**
     * Extract SPN (Suspect Parameter Number) from bytes
     * @param {Array} bytes - 4-byte array
     * @returns {number} SPN value
     */
    extractSPN: function(bytes) {
        var spnLow = (bytes[1] << 8) | bytes[0];  // 16-bit from bytes 1-2
        var spnHigh = (bytes[2] >> 5) & 0x07;     // Bits 5,6,7 from byte 3
        return (spnHigh << 16) | spnLow;
    },
    
    /**
     * Extract FMI (Failure Mode Identifier) from byte 3
     * @param {number} byte3 - Third byte
     * @returns {number} FMI value (bits 0-4)
     */
    extractFMI: function(byte3) {
        return byte3 & 0x1F;  // 5 bits: 00011111
    },
    
    /**
     * Extract OC (Occurrence Count) from byte 4
     * @param {number} byte4 - Fourth byte
     * @returns {number} OC value (bits 0-6)
     */
    extractOC: function(byte4) {
        return byte4 & 0x7F;  // 7 bits: 01111111
    },
    
    /**
     * Create DTC table HTML for display
     * @param {Array} dtcList - Array of parsed DTC objects
     * @returns {string} HTML table
     */
    createDTCTable: function(dtcList) {
        if (!dtcList || dtcList.length === 0) {
            return this.createNoDTCMessage();
        }
        
        return this.createActiveDTCTable(dtcList);
    },
    
    /**
     * Create "No Active DTCs" message
     * @returns {string} HTML message
     */
    createNoDTCMessage: function() {
        return '<div style="text-align: center; padding: 20px; color: #666;">' +
               '<i class="fa fa-check-circle" style="font-size: 24px; color: #00a65a;"></i>' +
               '<h4 style="margin: 10px 0;">No Active DTCs</h4>' +
               '<p>All systems operating normally</p>' +
               '</div>';
    },
    
    /**
     * Create active DTC table HTML
     * @param {Array} dtcList - Array of DTC objects
     * @returns {string} HTML table
     */
    createActiveDTCTable: function(dtcList) {
        var tableHeader = this.createTableHeader(dtcList.length);
        var tableRows = this.createTableRows(dtcList);
        
        return '<div style="padding: 10px;">' +
               tableHeader +
               '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">' +
               this.getTableHeaderHTML() +
               '<tbody>' + tableRows + '</tbody>' +
               '</table></div>';
    },
    
    /**
     * Create table header with DTC count
     * @param {number} count - Number of DTCs
     * @returns {string} HTML header
     */
    createTableHeader: function(count) {
        return '<h4 style="margin: 0 0 10px 0; color: #d73027;">' +
               '<i class="fa fa-exclamation-triangle"></i> ' +
               'Active Diagnostic Trouble Codes (' + count + ')' +
               '</h4>';
    },
    
    /**
     * Get table header HTML
     * @returns {string} HTML table header
     */
    getTableHeaderHTML: function() {
        return '<thead>' +
               '<tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">' +
               '<th style="padding: 8px 4px; text-align: center; border: 1px solid #ddd; font-weight: bold;">MCU</th>' +
               '<th style="padding: 8px 4px; text-align: center; border: 1px solid #ddd; font-weight: bold;">SPN</th>' +
               '<th style="padding: 8px 4px; text-align: center; border: 1px solid #ddd; font-weight: bold;">FMI</th>' +
               '<th style="padding: 8px 4px; text-align: center; border: 1px solid #ddd; font-weight: bold;">OC</th>' +
               '<th style="padding: 8px 4px; text-align: left; border: 1px solid #ddd; font-weight: bold;">Description</th>' +
               '</tr>' +
               '</thead>';
    },
    
    /**
     * Create table rows for DTCs
     * @param {Array} dtcList - Array of DTC objects
     * @returns {string} HTML table rows
     */
    createTableRows: function(dtcList) {
        var rows = '';
        
        Ext.each(dtcList, function(dtc, index) {
            var rowStyle = index % 2 === 0 ? 'background: #ffffff;' : 'background: #f9f9f9;';
            var description = this.getDTCDescription(dtc.spn, dtc.fmi);
            
            // Convert SPN and FMI to hexadecimal with proper padding
            // SPN: always 5 digits, FMI: always 2 digits
            var spnHex = dtc.spn.toString(16).toUpperCase().padStart(5, '0');
            var fmiHex = dtc.fmi.toString(16).toUpperCase().padStart(2, '0');
            
            rows += '<tr style="' + rowStyle + '">' +
                    '<td style="padding: 6px 4px; text-align: center; border: 1px solid #ddd;">' + dtc.mcuSource + '</td>' +
                    '<td style="padding: 6px 4px; text-align: center; border: 1px solid #ddd; font-family: monospace;">' + spnHex + '</td>' +
                    '<td style="padding: 6px 4px; text-align: center; border: 1px solid #ddd; font-family: monospace;">' + fmiHex + '</td>' +
                    '<td style="padding: 6px 4px; text-align: center; border: 1px solid #ddd; font-family: monospace;">' + dtc.oc + '</td>' +
                    '<td style="padding: 6px 4px; text-align: left; border: 1px solid #ddd; color: #333;">' + description + '</td>' +
                    '</tr>';
        }, this);
        
        return rows;
    },
    
    /**
     * Get human-readable description for SPN/FMI combination
     * @param {number} spn - Suspect Parameter Number
     * @param {number} fmi - Failure Mode Identifier
     * @returns {string} Description
     */
    getDTCDescription: function(spn, fmi) {
        var spnDesc = this.getSPNDescription(spn);
        var fmiDesc = this.getFMIDescription(fmi);
        return spnDesc + ' - ' + fmiDesc;
    },
    
    /**
     * Get SPN description
     * @param {number} spn - Suspect Parameter Number
     * @returns {string} SPN description
     */
    getSPNDescription: function(spn) {
        var descriptions = {
            91: 'Accelerator Pedal Position',
            94: 'Fuel Delivery Pressure',
            100: 'Engine Oil Pressure',
            105: 'Intake Manifold Temperature',
            110: 'Engine Coolant Temperature',
            157: 'Injector Metering Rail Pressure',
            175: 'Engine Oil Temperature',
            190: 'Engine Speed',
            512: 'Driver\'s Demand Engine - Percent Torque',
            513: 'Actual Engine - Percent Torque'
        };
        
        return descriptions[spn] || 'Unknown Parameter (SPN: ' + spn + ')';
    },
    
    /**
     * Get FMI description
     * @param {number} fmi - Failure Mode Identifier
     * @returns {string} FMI description
     */
    getFMIDescription: function(fmi) {
        var descriptions = {
            0: 'Data valid but above normal operational range',
            1: 'Data valid but below normal operational range', 
            2: 'Data erratic, intermittent or incorrect',
            3: 'Voltage above normal, or shorted to high source',
            4: 'Voltage below normal, or shorted to low source',
            5: 'Current below normal or open circuit',
            6: 'Current above normal or grounded circuit',
            7: 'Mechanical system not responding or out of adjustment',
            8: 'Abnormal frequency or pulse width or period',
            9: 'Abnormal update rate',
            10: 'Abnormal rate of change',
            11: 'Root cause not known',
            12: 'Bad intelligent device or component',
            13: 'Out of calibration',
            14: 'Special instructions',
            15: 'Data valid but above normal range - least severe level',
            16: 'Data valid but above normal range - moderately severe level',
            17: 'Data valid but below normal range - least severe level',
            18: 'Data valid but below normal range - moderately severe level',
            19: 'Received network data in error',
            31: 'Condition exists'
        };
        
        return descriptions[fmi] || 'Unknown failure mode';
    }
});
