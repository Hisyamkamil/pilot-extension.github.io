Ext.define('Store.dashpanel.view.Navigation', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.dashpanelnav',
    
    title: 'Sensor Monitor',
    iconCls: 'fa fa-tachometer-alt',
    iconAlign: 'left',
    layout: 'fit',
    
    initComponent: function() {
        var me = this;
        
        // Create vehicle tree for dashboard panel
        me.vehicleTree = Ext.create('Ext.tree.Panel', {
            title: 'Vehicles',
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
            // Create the tree store that loads vehicle data from PILOT API
            store: Ext.create('Ext.data.TreeStore', {
                proxy: {
                    type: 'ajax',
                    url: '/ax/tree.php?vehs=1&state=1'
                    // No reader needed - uses default tree reader
                },
                root: {
                    text: 'Vehicles',
                    expanded: true
                },
                autoLoad: true
            }),
            columns: [{
                xtype: 'treecolumn',
                text: 'Vehicle',
                dataIndex: 'name',
                flex: 2,
                renderer: function(value) {
                    return value || 'Unknown';
                }
            }, {
                text: 'Status',
                dataIndex: 'state',
                width: 80,
                renderer: function(value) {
                    if (value === 1) {
                        return '<span style="color: green;">●</span> Online';
                    }
                    return '<span style="color: red;">●</span> Offline';
                }
            }],
            listeners: {
                selectionchange: function(tree, selected) {
                    if (selected.length > 0) {
                        var record = selected[0];
                        if (record.get('leaf') && (record.get('id') || record.get('vehicle_id'))) {
                            var vehicleId = record.get('id') || record.get('vehicle_id');
                            var vehicleName = record.get('name') || record.get('text') || 'Unknown Vehicle';
                            
                            // Update main panel with selected vehicle
                            if (me.map_frame) {
                                me.map_frame.loadVehicleData(vehicleId, vehicleName, record);
                            }
                            
                            // Trigger MainPanelV2 sensor loading (direct call)
                            if (window.dashpanelModule && window.dashpanelModule.mainPanel) {
                                console.log('🚗 Calling MainPanelV2.loadVehicleData for:', vehicleName);
                                window.dashpanelModule.mainPanel.loadVehicleData(vehicleId, vehicleName, record);
                            } else {
                                console.error('❌ MainPanelV2 not available from navigation');
                            }
                        }
                    }
                }
            }
        });
        
        me.items = [me.vehicleTree];
        
        me.callParent(arguments);
    }
});
