var widget = new Cesium.Viewer('cesiumContainer',{
	timeline: false,
	animation: false,
	homeButton: false,
	infoButton: false,
	navigationHelpButton: false,
	sceneModePicker: false,
	selectionIndicator: false,
	geocoder: false,
	baseLayerPicker: false});

var scene = widget.scene;
widget.camera.flyTo({
    destination : Cesium.Cartesian3.fromDegrees(18.837977, -33.963745, 15000000.0)
});

//var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
//    Cesium.Cartesian3.fromDegrees(18.837977, -33.963745, 0.0));
//var model = scene.primitives.add(Cesium.Model.fromGltf({
//    url : 'Apps/SampleData/models/CesiumAir/Cesium_Air.gltf',
//    modelMatrix : modelMatrix,
//    scale : 20000.0
//}));

//var blueBox = widget.entities.add({
//    name : 'Blue box',
//    position: Cesium.Cartesian3.fromDegrees(18.837977, -33.963745, 300000.0),
//    box : {
//        dimensions : new Cesium.Cartesian3(100000.0, 100000.0, 100000.0),
//        material : Cesium.Color.BLUE.withAlpha(0.5)
//    }
//});

var socket = io();
console.log('Socket created');

var czmlDataSource = new Cesium.CzmlDataSource();
socket.on('czml-test', function(msg){
	var response = JSON.parse(msg);
	czmlDataSource.process(response);
	widget.dataSources.add(czmlDataSource);
//   console.log('Received dummy data: ' + msg.id);
//   blueBox.position = Cesium.Cartesian3.fromDegrees(msg.lon, msg.lat, 30000.0);
//   model.position = Cesium.Cartesian3.fromDegrees(msg.lon, -33.963745, 30000.0);
});
