Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5YzA4N2I4OC01NjBkLTRjYzUtOGI1Zi04MzM1OTg5ZTAzM2UiLCJpZCI6MTE1OTAsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NTkyODE0OTN9.zocE1MMKfFHbSdXTH0whvsZdf7aB-Bq2OnEjI0rCelI';

var bing = new Cesium.BingMapsImageryProvider({
    url : 'https://dev.virtualearth.net',
    key : 'f9bi6fIZNm3w98sNXXhR~H1vdqlbzNAuLNn6607rNiA~AhiZmKtvhQltEYCRO3P6Z7yugnt-UVX4wFSoVOdgpiU5MNT4Af9bUCBUJJszna9a',
    mapStyle : Cesium.BingMapsStyle.AERIAL
});

// setup scene
var viewer = new Cesium.Viewer('cesiumContainer',{
	timeline: true,
	animation: true,
	shouldAnimate: true,
	homeButton: false,
	infoButton: false,
	navigationHelpButton: false,
	sceneModePicker: false,
	selectionIndicator: false,
	geocoder: false,
	baseLayerPicker: false,
	shadows: true,
	imageryProvider: bing,
	creditContainer: 'dummy'});
	
var scene = viewer.scene;
scene.globe.enableLighting = true;
scene.globe.depthTestAgainstTerrain = false;
scene.globe.showGroundAtmosphere = false;
scene.highDynamicRange = true;
scene.moon = new Cesium.Moon();
scene.sun = new Cesium.Sun();

clock_1 = viewer.clockViewModel.clock;
// stop clock
clock_1._shouldAnimate = false;
// default timeline view
viewer.animation.container.hidden = true;
viewer.timeline.container.hidden = true;
viewTimelineEnabled = false;

var home_lon = 18.837977;
var home_lat = 0;
// set camera origin
viewer.camera.flyTo({
    destination : Cesium.Cartesian3.fromDegrees(home_lon, home_lat, 25000000.0)
});

var TLE_data;
var satrecs = [];
var sampledPosition = [];	
var sampledOrientation = [];

function createEntity(count,name,tle1,tle2){
	var satellites = viewer.entities.add({
		id: name,
		name: name,
		//model: {
		//	uri: 'CubeSpaceDemo/models/3U_4_low.gltf',
		//	minimumPixelSize: 0.0,
		//	show: true
		//},
		point: {
			color: Cesium.Color.RED,
			pixelSize: 5,
			outlineColor: Cesium.Color.WHITE,
			outlineWidth: 1
		}
	});
	satrecs[count] = satellite.twoline2satrec(tle1, tle2);
	
	sampledPosition[count] = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.INERTIAL, 0);
	sampledPosition[count].setInterpolationOptions({
		interpolationDegree: 5,
		interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
	});
	sampledPosition[count].forwardExtrapolationDuration = 5;
	satellites.position = sampledPosition[count];
	
	// create orientation property
	sampledOrientation[count] = new Cesium.SampledProperty(Cesium.Quaternion);
	sampledOrientation[count].setInterpolationOptions({
		interpolationDegree: 5,
		interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
	});
	sampledOrientation[count].forwardExtrapolationDuration = 5;
	satellites.orientation = sampledOrientation[count];
}

function update_tles(){
	$.post("/tle",{},
	function(data, status){
		TLE_data = data; 
		console.log('Updated TLEs from server.')
		console.log(data);
		for (var i = 0; i < TLE_data.length; i++){
			satrecs[i] = satellite.twoline2satrec(data[i].tle[1], data[i].tle[2]);  
		}
	});	
}

$.post("/tle",{},
function(data, status){
	TLE_data = data; 
	console.log('Received TLEs from server.');
	console.log(data);
	for (var i = 0; i < TLE_data.length; i++){
		createEntity(i, data[i].name, data[i].tle[1], data[i].tle[2]);  
	}
	  
	setInterval(sgp4_propagate, 1000);
	setInterval(update_tles, 36000000);
});

var start_counter = 0;
var g_pitch = 0;
var g_roll = 0;
var g_yaw = 0;

function sgp4_propagate(){
	js_time = new Date();
	var jd_time = Cesium.JulianDate.fromDate(js_time);
	for (var i = 0; i < TLE_data.length; i++){
		var positionAndVelocity = satellite.propagate(satrecs[i], js_time);
		sat_position = new Cesium.Cartesian3(positionAndVelocity.position.x*1e3, positionAndVelocity.position.y*1e3, positionAndVelocity.position.z*1e3);
		sat_velocity = new Cesium.Cartesian3(positionAndVelocity.velocity.x, positionAndVelocity.velocity.y, positionAndVelocity.velocity.z);
		sampledPosition[i].addSample(jd_time, sat_position);

		//g_yaw = g_yaw + 0.0; 
		//g_pitch = g_pitch - 0.1; 
		//g_roll = 0;
		hpr = new Cesium.HeadingPitchRoll(g_yaw, g_pitch, g_roll);
		qc = new Cesium.Quaternion.fromHeadingPitchRoll(hpr);
		sampledOrientation[i].addSample(jd_time, qc);	
	}
	start_counter++;
	if (start_counter > 2 && start_counter < 5){
		clock_1._shouldAnimate = true;
		console.log('Visualiser is live now.')
	}
}

// handle keyboard shortcuts
// toggle model view
Mousetrap.bind('t', function (e) {
    if (viewTimelineEnabled) {
        viewer.animation.container.hidden = true
		//viewer.timeline.container.hidden = true
        viewTimelineEnabled = false;
    }
    else {
        viewer.animation.container.hidden = false
		//viewer.timeline.container.hidden = false
        viewTimelineEnabled = true;
    }
});
// home view
Mousetrap.bind('h', function (e) {
    var transitioner = new Cesium.SceneModePickerViewModel(viewer.scene);
    transitioner.morphTo3D();
    // set camera origin
	viewer.camera.flyTo({
		destination : Cesium.Cartesian3.fromDegrees(home_lon, home_lat, 25000000.0)
	});

    viewer.trackedEntity = undefined;
});