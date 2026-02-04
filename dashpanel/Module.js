Ext.define('Store.SensorMonitoring.Module', {
    extend: 'Ext.Component',

    initModule: function () {
        // Create navigation tab component
        var navTab = Ext.create('Store.SensorMonitoring.view.Navigation');
        
        // Create main panel component for sensor data display
        var mainPanel = Ext.create('Store.SensorMonitoring.view.MainPanel');
        
        // Link navigation tab to main panel (mandatory requirement)
        navTab.map_frame = mainPanel;
        
        // Add to PILOT skeleton
        skeleton.navigation.add(navTab);
        skeleton.mapframe.add(mainPanel);
    }
});
