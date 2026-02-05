Ext.define('Store.dashpanel.Module',{
    extend: 'Ext.Component',

    initModule: function () {
        // Create navigation tab component
        var navTab = Ext.create('Store.dashpanel.view.Navigation');
        
        // Create main panel component for sensor data display
        var mainPanel = Ext.create('Store.dashpanel.view.MainPanel');
        
        // Link navigation tab to main panel (mandatory requirement)
        navTab.map_frame = mainPanel;
        
        // Add to PILOT skeleton
        skeleton.navigation.add(navTab);
        skeleton.mapframe.add(mainPanel);
    }
});
