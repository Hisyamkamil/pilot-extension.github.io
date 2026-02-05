Ext.define('Store.dashpanel.view.Navigation', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.dashpanelnav',
    
    title: 'Dashboard Panel',
    iconCls: 'fa fa-tachometer-alt',
    iconAlign: 'top',
    layout: 'fit',
    
    initComponent: function() {
        var me = this;
        
        // Create vehicle tree for dashboard panel
        me.vehicleTree = Ext.create('Ext.tree.Panel', {
            title: 'Vehicles',
            rootVisible: false,
            store: Ext.create('Ext.data.TreeStore', {
                root: {
                    expanded: true,
                    children: []
                }
            }),
            columns: [{
                xtype: 'treecolumn',
                text: 'Vehicle',
                dataIndex: 'text',
                flex: 1
            }, {
                text: 'Status',
                dataIndex: 'status',
                width: 80,
                renderer: function(value) {
                    if (value === 'online') {
                        return '<span style="color: green;">●</span> Online';
                    }
                    return '<span style="color: red;">●</span> Offline';
                }
            }],
            listeners: {
                selectionchange: function(tree, selected) {
                    if (selected.length > 0) {
                        var record = selected[0];
                        if (record.get('leaf') && record.get('vehicle_id')) {
                            // Update main panel with selected vehicle
                            if (me.map_frame) {
                                me.map_frame.loadVehicleSensors(record.get('vehicle_id'), record.get('text'));
                            }
                        }
                    }
                }
            }
        });
        
        me.items = [me.vehicleTree];
        
        me.callParent(arguments);
        
        // Load vehicle data on component ready
        me.on('afterrender', function() {
            me.loadVehicleData();
        });
    },
    
    loadVehicleData: function() {
        var me = this;
        
        // Load vehicles from PILOT API as required by AI_SPECS
        Ext.Ajax.request({
            url: 'https://dev-telematics.mst.co.id/ax/tree.php',
            params: { 
                vehs: 1, 
                state: 1 
            },
            success: function(response) {
                try {
                    var data = Ext.decode(response.responseText);
                    var treeData = [];
                    
                    // Parse groups -> children structure as specified in AI_SPECS
                    if (Ext.isArray(data)) {
                        Ext.each(data, function(group) {
                            if (group.children && Ext.isArray(group.children)) {
                                var groupNode = {
                                    text: group.text || 'Group',
                                    expanded: true,
                                    leaf: false,
                                    children: []
                                };
                                
                                // Add vehicles from children array
                                Ext.each(group.children, function(vehicle) {
                                    groupNode.children.push({
                                        text: vehicle.text || vehicle.name || 'Vehicle',
                                        leaf: true,
                                        vehicle_id: vehicle.id || vehicle.vehicle_id,
                                        status: vehicle.state === 1 ? 'online' : 'offline',
                                        iconCls: 'fa fa-car'
                                    });
                                });
                                
                                treeData.push(groupNode);
                            }
                        });
                    }
                    
                    // Update tree store
                    me.vehicleTree.getStore().setRootNode({
                        expanded: true,
                        children: treeData
                    });
                    
                } catch (e) {
                    console.error('Error parsing vehicle data:', e);
                    console.warn('Using fallback data due to parsing error');
                    me.loadFallbackVehicleData();
                }
            },
            failure: function() {
                console.warn('Failed to load vehicle data from PILOT API, using fallback data');
                // Load fallback mock data for demonstration when API is unavailable
                me.loadFallbackVehicleData();
            }
        });
    },
    
    // Fallback mock data for demonstration when PILOT API is unavailable
    loadFallbackVehicleData: function() {
        var me = this;
        
        var fallbackData = [{
            text: 'Fleet Group 1',
            expanded: true,
            leaf: false,
            children: [{
                text: 'Truck-001',
                leaf: true,
                vehicle_id: 'demo_001',
                status: 'online',
                iconCls: 'fa fa-truck'
            }, {
                text: 'Truck-002',
                leaf: true,
                vehicle_id: 'demo_002',
                status: 'offline',
                iconCls: 'fa fa-truck'
            }]
        }, {
            text: 'Fleet Group 2',
            expanded: true,
            leaf: false,
            children: [{
                text: 'Van-003',
                leaf: true,
                vehicle_id: 'demo_003',
                status: 'online',
                iconCls: 'fa fa-car'
            }]
        }];
        
        // Update tree store with fallback data
        me.vehicleTree.getStore().setRootNode({
            expanded: true,
            children: fallbackData
        });
        
        // Show info message that this is demo data
        Ext.Msg.show({
            title: 'Demo Mode',
            message: 'Using demonstration vehicle data. Connect to PILOT API for real data.',
            buttons: Ext.Msg.OK,
            icon: Ext.Msg.INFO
        });
    }
});
