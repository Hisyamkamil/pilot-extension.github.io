Ext.define('Store.dashpanel.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        var me = this;
        
        console.log('Panel V2 (Context Menu) extension initializing...');
        
        // Store reference for later use in context menu handlers
        window.panelModule = me;
        
        // Safely access the online tree and add context menu item
        me.initializeContextMenu();
    },
    
    initializeContextMenu: function() {
        var me = this;
        
        // Try to access online tree safely
        if (skeleton && skeleton.navigation && skeleton.navigation.online && skeleton.navigation.online.online_tree) {
            var tree = skeleton.navigation.online.online_tree;
            
            console.log('Found online tree, adding context menu item...');
            
            // Handle both possible context menu property names
            var contextMenu = tree.context_menu || tree.contextmenu;
            
            if (contextMenu) {
                // Add menu item to existing context menu
                contextMenu.add({
                    text: 'View Panel',
                    iconCls: 'fa fa-tachometer-alt',
                    scope: tree,
                    handler: function() {
                        // 'this' refers to the tree due to scope
                        if (this.record) {
                            console.log('Context menu clicked for vehicle:', this.record.get('name'));
                            me.openSensorWindow(this.record);
                        } else {
                            console.warn('No vehicle record selected');
                        }
                    }
                });
                
                console.log('✅ Context menu item added successfully');
            } else {
                console.error('❌ Context menu not found on online tree');
            }
        } else {
            console.error('❌ Online tree not available');
        }
    },
    
    openSensorWindow: function(vehicleRecord) {
        var me = this;
        
        var vehicleName = vehicleRecord.get('name') || vehicleRecord.get('text') || 'Unknown Vehicle';
        var vehicleId = vehicleRecord.get('id') || vehicleRecord.get('imei') || vehicleRecord.get('agent_id');
        
        console.log('Opening sensor window for:', vehicleName, 'ID:', vehicleId);
        
        // Check if window is already open
        var existingWindow = Ext.getCmp('panel-sensor-window');
        if (existingWindow) {
            existingWindow.close();
        }
        
        // Create sensor data store
        var sensorStore = Ext.create('Ext.data.Store', {
            fields: [
                'sensor_name',
                'sensor_type', 
                'current_value',
                'unit',
                'status',
                'last_update',
                'human_value'
            ],
            data: []
        });
        
        // Create the modal window
        var sensorWindow = Ext.create('Ext.window.Window', {
            id: 'panel-sensor-window',
            title: '🔧 Panel - ' + vehicleName,
            width: 900,
            height: 600,
            modal: true,
            layout: 'border',
            closable: true,
            resizable: true,
            
            items: [{
                // Top panel with vehicle info
                region: 'north',
                xtype: 'panel',
                height: 80,
                html: '<div style="padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">' +
                      '<h3 style="margin: 0; color: white;"><i class="fa fa-car"></i> ' + vehicleName + '</h3>' +
                      '<span>Vehicle ID: ' + vehicleId + ' | Real-time sensor monitoring</span>' +
                      '</div>',
                border: false
            }, {
                // Main sensor grid
                region: 'center',
                xtype: 'grid',
                store: sensorStore,
                columns: [{
                    text: 'Sensor Name',
                    dataIndex: 'sensor_name',
                    flex: 2,
                    renderer: function(value, meta, record) {
                        var iconClass = me.getSensorIcon(record.get('sensor_type'));
                        return '<i class="' + iconClass + '"></i> ' + value;
                    }
                }, {
                    text: 'Type',
                    dataIndex: 'sensor_type',
                    width: 100
                }, {
                    text: 'Current Value',
                    dataIndex: 'current_value',
                    width: 120,
                    renderer: function(value, meta, record) {
                        var unit = record.get('unit') || '';
                        var status = record.get('status');
                        
                        // Color coding based on status
                        var color = '#000';
                        if (status === 'warning') color = '#ff8c00';
                        else if (status === 'critical') color = '#ff0000';
                        else if (status === 'normal') color = '#008000';
                        
                        var formattedValue = value;
                        if (typeof value === 'number') {
                            formattedValue = Ext.util.Format.number(value, '0.##');
                        }
                        
                        return '<span style="color: ' + color + '; font-weight: bold;">' + formattedValue + ' ' + unit + '</span>';
                    }
                }, {
                    text: 'Status',
                    dataIndex: 'status',
                    width: 80,
                    renderer: function(value) {
                        var icon = '';
                        var color = '';
                        
                        switch(value) {
                            case 'normal':
                                icon = 'fa fa-check-circle';
                                color = 'green';
                                break;
                            case 'warning':
                                icon = 'fa fa-exclamation-triangle';
                                color = 'orange';
                                break;
                            case 'critical':
                                icon = 'fa fa-times-circle';
                                color = 'red';
                                break;
                            default:
                                icon = 'fa fa-question-circle';
                                color = 'gray';
                        }
                        
                        return '<i class="' + icon + '" style="color: ' + color + ';"></i> ' + 
                               (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown');
                    }
                }, {
                    text: 'Last Update',
                    dataIndex: 'last_update',
                    width: 140,
                    renderer: function(value) {
                        if (value) {
                            return Ext.Date.format(new Date(value), 'Y-m-d H:i:s');
                        }
                        return '-';
                    }
                }],
                viewConfig: {
                    emptyText: 'Loading sensor data...',
                    deferEmptyText: false
                }
            }],
            
            // Window toolbar with refresh button
            tbar: [{
                text: 'Refresh',
                iconCls: 'fa fa-refresh',
                handler: function() {
                    me.loadSensorDataForWindow(vehicleId, sensorStore);
                }
            }, '->', {
                xtype: 'tbtext',
                text: 'Auto-refresh every 10 seconds',
                style: 'color: #666;'
            }],
            
            listeners: {
                afterrender: function() {
                    // Load initial sensor data
                    me.loadSensorDataForWindow(vehicleId, sensorStore);
                    
                    // Set up auto-refresh
                    me.startAutoRefresh(vehicleId, sensorStore);
                },
                close: function() {
                    // Clean up auto-refresh on window close
                    me.stopAutoRefresh();
                }
            }
        });
        
        sensorWindow.show();
    },
    
    startAutoRefresh: function(vehicleId, store) {
        var me = this;
        
        // Stop existing refresh
        me.stopAutoRefresh();
        
        // Start new refresh every 10 seconds
        me.refreshTask = setInterval(function() {
            me.loadSensorDataForWindow(vehicleId, store);
        }, 10000);
        
        console.log('Auto-refresh started for vehicle:', vehicleId);
    },
    
    stopAutoRefresh: function() {
        var me = this;
        
        if (me.refreshTask) {
            clearInterval(me.refreshTask);
            me.refreshTask = null;
            console.log('Auto-refresh stopped');
        }
    },
    
    loadSensorDataForWindow: function(vehicleId, store) {
        var me = this;
        
        console.log('🔄 Loading sensor data for vehicle ID:', vehicleId);
        
        // Try v3 API first, then fallback to backend API
        me.tryV3APIForWindow(vehicleId, store);
    },
    
    tryV3APIForWindow: function(vehicleId, store) {
        var me = this;
        
        // Try PILOT v3 API first
        Ext.Ajax.request({
            url: '/api/v3/vehicles/status',
            headers: {
                'Authorization': 'Bearer 010b2ec453be98c07694d807b30861d1'
            },
            params: {
                agent_id: vehicleId
            },
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    if (data.code === 0 && data.data && data.data.length > 0) {
                        console.log('✅ Processing sensor data from v3 API');
                        me.processV3SensorData(data.data[0], store);
                        return;
                    }
                } catch (e) {
                    console.error('v3 API parse error:', e);
                }
                // Fallback to backend API
                me.tryBackendAPIForWindow(vehicleId, store);
            },
            failure: function(response) {
                console.warn('❌ v3 API failed, trying backend API...');
                // Fallback to backend API
                me.tryBackendAPIForWindow(vehicleId, store);
            }
        });
    },
    
    tryBackendAPIForWindow: function(vehicleId, store) {
        var me = this;
        
        // Try backend API
        Ext.Ajax.request({
            url: '/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processBackendSensorData(data, vehicleId, store);
                } catch (e) {
                    console.error('❌ Backend API parse error:', e);
                    // Try external URL
                    me.tryExternalBackendAPIForWindow(vehicleId, store);
                }
            },
            failure: function(response) {
                console.warn('❌ Backend API failed, trying external...');
                // Try external URL
                me.tryExternalBackendAPIForWindow(vehicleId, store);
            }
        });
    },
    
    tryExternalBackendAPIForWindow: function(vehicleId, store) {
        var me = this;
        
        // Try external backend API
        Ext.Ajax.request({
            url: 'https://dev-telematics.mst.co.id/backend/ax/current_data.php',
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    me.processBackendSensorData(data, vehicleId, store);
                } catch (e) {
                    console.error('❌ External API parse error:', e);
                    me.showNoDataInWindow(store);
                }
            },
            failure: function(response) {
                console.error('❌ External API failed:', response.status);
                me.showNoDataInWindow(store);
            }
        });
    },
    
    processV3SensorData: function(vehicleData, store) {
        var me = this;
        var sensorDataArray = [];
        
        // Process v3 API sensor data
        if (vehicleData && Ext.isArray(vehicleData.sensors)) {
            Ext.each(vehicleData.sensors, function(sensor) {
                var sensorType = me.determineSensorType(sensor.name);
                var status = me.calculateSensorStatus(sensor.dig_value, sensorType);
                
                sensorDataArray.push({
                    sensor_name: sensor.name || 'Unknown Sensor',
                    sensor_type: sensorType,
                    current_value: sensor.dig_value,
                    unit: me.extractUnit(sensor.hum_value),
                    status: status,
                    last_update: new Date(sensor.change_ts * 1000),
                    human_value: sensor.hum_value
                });
            });
        }
        
        console.log('✅ V3 sensor data processed. Count:', sensorDataArray.length);
        store.loadData(sensorDataArray);
    },
    
    processBackendSensorData: function(data, vehicleId, store) {
        var me = this;
        var sensorDataArray = [];
        
        console.log('Processing backend sensor data for vehicle:', vehicleId);
        
        // Backend API returns: {c: 0, objects: [...]}
        if (data && data.c === 0 && Ext.isArray(data.objects)) {
            // Find the vehicle by ID
            var vehicle = null;
            Ext.each(data.objects, function(obj) {
                if (obj.id == vehicleId || obj.veh_id == vehicleId) {
                    vehicle = obj;
                    return false;
                }
            });
            
            if (!vehicle) {
                console.error('❌ Vehicle ID', vehicleId, 'not found');
                me.showNoDataInWindow(store);
                return;
            }
            
            console.log('✅ Found vehicle:', vehicle.name);
            
            // Add basic vehicle data
            if (vehicle.last_event && vehicle.last_event.speed !== undefined) {
                sensorDataArray.push({
                    sensor_name: 'Vehicle Speed',
                    sensor_type: 'speed',
                    current_value: vehicle.last_event.speed,
                    unit: 'km/h',
                    status: vehicle.last_event.speed > 80 ? 'warning' : 'normal',
                    last_update: new Date(vehicle.unixtimestamp * 1000),
                    human_value: vehicle.last_event.speed + ' km/h'
                });
            }
            
            // Add engine status
            if (vehicle.firing !== undefined) {
                sensorDataArray.push({
                    sensor_name: 'Engine Status',
                    sensor_type: 'engine',
                    current_value: vehicle.firing ? 'ON' : 'OFF',
                    unit: '',
                    status: 'normal',
                    last_update: new Date(vehicle.unixtimestamp * 1000),
                    human_value: vehicle.firing ? 'Engine On' : 'Engine Off'
                });
            }
            
            // Process sensors object
            if (vehicle.sensors && typeof vehicle.sensors === 'object') {
                console.log('Processing', Object.keys(vehicle.sensors).length, 'sensors...');
                
                Ext.Object.each(vehicle.sensors, function(sensorName, sensorValue) {
                    // Parse: "14 %|1770111620|1507796|14|Auto Can|11|1|3"
                    var parts = sensorValue.split('|');
                    if (parts.length >= 4) {
                        var humanValue = parts[0];
                        var timestamp = parseInt(parts[1]);
                        var digitalValue = parseFloat(parts[3]);
                        
                        var sensorType = me.determineSensorType(sensorName);
                        var status = me.calculateSensorStatus(digitalValue, sensorType);
                        var unit = me.extractUnit(humanValue);
                        
                        sensorDataArray.push({
                            sensor_name: sensorName,
                            sensor_type: sensorType,
                            current_value: digitalValue,
                            unit: unit,
                            status: status,
                            last_update: new Date(timestamp * 1000),
                            human_value: humanValue
                        });
                    }
                });
            }
        }
        
        if (sensorDataArray.length === 0) {
            me.showNoDataInWindow(store);
            return;
        }
        
        console.log('✅ Backend sensor data processed. Count:', sensorDataArray.length);
        store.loadData(sensorDataArray);
    },
    
    showNoDataInWindow: function(store) {
        store.loadData([{
            sensor_name: 'No Data Available',
            sensor_type: 'error',
            current_value: 'Unable to load sensor data',
            unit: '',
            status: 'critical',
            last_update: new Date(),
            human_value: 'Error'
        }]);
    },
    
    // Helper methods (same as V1)
    determineSensorType: function(sensorName) {
        if (!sensorName) return 'generic';
        
        var name = sensorName.toLowerCase();
        if (name.includes('температур') || name.includes('temp')) return 'temperature';
        if (name.includes('давлен') || name.includes('pressure')) return 'pressure';
        if (name.includes('топлив') || name.includes('fuel') || name.includes('уровень')) return 'level';
        if (name.includes('напряж') || name.includes('voltage') || name.includes('вольт')) return 'voltage';
        if (name.includes('скорост') || name.includes('speed')) return 'speed';
        if (name.includes('нагрузк') || name.includes('вес') || name.includes('load') || name.includes('weight')) return 'weight';
        
        return 'generic';
    },
    
    extractUnit: function(humValue) {
        if (!humValue) return '';
        
        var matches = humValue.toString().match(/([a-zA-Zа-яА-Я°%/]+)$/);
        return matches ? matches[1] : '';
    },
    
    calculateSensorStatus: function(value, sensorType) {
        if (value === null || value === undefined) return 'unknown';
        
        switch (sensorType) {
            case 'temperature':
                if (value > 100 || value < -20) return 'critical';
                if (value > 80 || value < 0) return 'warning';
                return 'normal';
                
            case 'voltage':
                if (value > 15 || value < 10) return 'critical';
                if (value > 14 || value < 11) return 'warning';
                return 'normal';
                
            case 'pressure':
                if (value > 100 || value < 0) return 'critical';
                if (value > 80 || value < 10) return 'warning';
                return 'normal';
                
            case 'level':
                if (value < 5) return 'critical';
                if (value < 15) return 'warning';
                return 'normal';
                
            default:
                return 'normal';
        }
    },
    
    getSensorIcon: function(sensorType) {
        switch(sensorType) {
            case 'temperature': return 'fa fa-thermometer-half';
            case 'pressure': return 'fa fa-tachometer-alt';
            case 'level': return 'fa fa-battery-half';
            case 'voltage': return 'fa fa-bolt';
            case 'speed': return 'fa fa-speedometer';
            case 'weight': return 'fa fa-weight';
            case 'engine': return 'fa fa-cog';
            default: return 'fa fa-microchip';
        }
    }
});
