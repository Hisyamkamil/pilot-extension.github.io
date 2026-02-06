Ext.define('Store.dashpanel.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        var me = this;
        
        console.log('Dashpanel V2 (Sub-panel in Online Navigation) extension initializing...');
        
        // Store reference for later use
        window.dashpanelModule = me;
        
        // Add sub-panel to existing Online navigation (left side)
        me.addSubPanelToOnlineNavigation();
    },
    
    addSubPanelToOnlineNavigation: function() {
        var me = this;
        
        // Access existing Online navigation panel
        if (skeleton && skeleton.navigation && skeleton.navigation.online) {
            var onlinePanel = skeleton.navigation.online;
            
            console.log('Found existing Online panel, adding Dashboard sub-panel...');
            
            // Create vehicle tree for dashboard (sub-panel in Online navigation)
            var dashboardSubPanel = Ext.create('Ext.panel.Panel', {
                title: 'Dashboard Panel',
                iconCls: 'fa fa-tachometer-alt',
                layout: 'fit',
                height: 300,
                collapsible: true,
                split: true,
                
                items: [{
                    xtype: 'treepanel',
                    title: 'Vehicles for Dashboard',
                    tools:[{
                        xtype:'button',
                        iconCls: 'fa fa-rotate',
                        tooltip: 'Refresh',
                        handler: function () {
                            this.up('treepanel').getStore().load();
                        }
                    }],
                    rootVisible: false,
                    useArrows: true,
                    border: false,
                    // Load vehicles from PILOT API
                    store: Ext.create('Ext.data.TreeStore', {
                        proxy: {
                            type: 'ajax',
                            url: '/ax/tree.php?vehs=1&state=1'
                        },
                        root: {
                            text: 'Vehicles',
                            expanded: true
                        },
                        autoLoad: true
                    }),
                    columns: [{
                        text: 'Vehicle',
                        xtype:'treecolumn',
                        dataIndex: 'name',
                        flex: 2,
                        renderer: function(value) {
                            return value || 'Unknown';
                        }
                    }, {
                        text: 'Status',
                        dataIndex: 'state',
                        width: 70,
                        renderer: function(value) {
                            if (value === 1) {
                                return '<span style="color: green;">●</span>';
                            }
                            return '<span style="color: red;">●</span>';
                        }
                    }],
                    listeners: {
                        selectionchange: function(tree, selected) {
                            if (selected.length > 0) {
                                var record = selected[0];
                                if (record.get('leaf') && (record.get('id') || record.get('vehicle_id'))) {
                                    var vehicleId = record.get('id') || record.get('vehicle_id');
                                    var vehicleName = record.get('name') || record.get('text') || 'Unknown Vehicle';
                                    me.showMainPanelWithMap(vehicleId, vehicleName, record);
                                }
                            }
                        }
                    }
                }]
            });
            
            // Add sub-panel to existing Online navigation
            if (onlinePanel.add) {
                onlinePanel.add(dashboardSubPanel);
                console.log('✅ Dashboard sub-panel added to Online navigation');
            } else {
                console.error('❌ Cannot add sub-panel to Online navigation');
            }
            
        } else {
            console.error('❌ Online navigation not available');
        }
    },
    
    showMainPanelWithMap: function(vehicleId, vehicleName, vehicleRecord) {
        var me = this;
        
        console.log('🚗 Showing main panel with map for vehicle:', vehicleName, 'ID:', vehicleId);
        
        // Check if main panel already exists
        var existingPanel = Ext.getCmp('dashpanel-main-v2');
        if (existingPanel) {
            console.log('Main panel exists, updating with new vehicle data');
            existingPanel.loadVehicleData(vehicleId, vehicleName, vehicleRecord);
            return;
        }
        
        // Create hybrid main panel: Map (top) + Sensors (bottom) 
        var mainPanel = Ext.create('Store.dashpanel.view.MainPanelV2', {
            id: 'dashpanel-main-v2'
        });
        
        // Add to mapframe (main content area)
        try {
            skeleton.mapframe.add(mainPanel);
            console.log('✅ Hybrid main panel (Map + Sensors) added to mapframe');
            
            // Load vehicle data
            mainPanel.loadVehicleData(vehicleId, vehicleName, vehicleRecord);
            
        } catch (e) {
            console.error('❌ Failed to add hybrid main panel to mapframe:', e);
            
            // Fallback: show alert
            Ext.Msg.alert('Error', 'Unable to create main panel. Check console for details.');
        }
    }
});
