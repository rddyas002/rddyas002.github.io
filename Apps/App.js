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
		model: {
			uri: 'Apps/models/EOSat1_SD/EOSat1_SD.gltf',
			minimumPixelSize: 0.0,
			show: true
		},
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
		interpolationDegree: 3,
		interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
	});
	sampledPosition[count].forwardExtrapolationDuration = 10;
	satellites.position = sampledPosition[count];
	
	// create orientation property
	sampledOrientation[count] = new Cesium.SampledProperty(Cesium.Quaternion);
	sampledOrientation[count].setInterpolationOptions({
		interpolationDegree: 10,
		interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
	});
	sampledOrientation[count].forwardExtrapolationDuration = 10;
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

function computeNadir_q_ecef(cesium_time, pos, vel){
	var Teme2Fixed = Cesium.Transforms.computeTemeToPseudoFixedMatrix(cesium_time, new Cesium.Matrix3());
	
	var nadir = Cesium.Cartesian3.negate(pos, new Cesium.Cartesian3());
	var n_z = Cesium.Cartesian3.normalize(nadir, new Cesium.Cartesian3());	// new z
	var n_x = Cesium.Cartesian3.normalize(vel, new Cesium.Cartesian3());	// new x
	var n_y = Cesium.Cartesian3.cross(n_z, n_x, new Cesium.Cartesian3());	// new y
	Cesium.Cartesian3.normalize(n_y, n_y);
	var n_x2 = Cesium.Cartesian3.cross(n_y, n_z, new Cesium.Cartesian3());	// new x
	// transform to ecef
	var n_x_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_x2, new Cesium.Cartesian3());
	var n_y_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_y, new Cesium.Cartesian3());
	var n_z_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_z, new Cesium.Cartesian3());
		
	var model = new Cesium.Matrix3(n_x_ecef.x, n_y_ecef.x, n_z_ecef.x, n_x_ecef.y, n_y_ecef.y, n_z_ecef.y, n_x_ecef.z, n_y_ecef.z, n_z_ecef.z);	// ecef to body
	var offset = Cesium.Matrix3.fromHeadingPitchRoll(new Cesium.HeadingPitchRoll(0, 0, 0), new Cesium.Matrix3());
	var out = Cesium.Matrix3.multiply(model, offset, new Cesium.Matrix3());
	
	return Cesium.Quaternion.fromRotationMatrix(out, new Cesium.Quaternion());
}

var y_thompson = false;
function sgp4_propagate(){
	js_time = new Date();
	var jd_time = Cesium.JulianDate.fromDate(js_time);
	for (var i = 0; i < TLE_data.length; i++){
		var positionAndVelocity = satellite.propagate(satrecs[i], js_time);
		sat_position = new Cesium.Cartesian3(positionAndVelocity.position.x*1e3, positionAndVelocity.position.y*1e3, positionAndVelocity.position.z*1e3);
		sat_velocity = new Cesium.Cartesian3(positionAndVelocity.velocity.x, positionAndVelocity.velocity.y, positionAndVelocity.velocity.z);
		sampledPosition[i].addSample(jd_time, sat_position);
		
		var q_nadir = computeNadir_q_ecef(jd_time, sat_position, sat_velocity);	

		if (y_thompson){
			g_yaw = g_yaw + 0.0; 
			g_pitch = g_pitch + 1*Cesium.Math.PI/180; 
			g_roll = 0;			
		}
		else{
			g_yaw = 0.0; 
			g_pitch = 0; 
			g_roll = 0;			
		}

		var q_hpr = Cesium.Quaternion.fromHeadingPitchRoll(new Cesium.HeadingPitchRoll(g_yaw, g_pitch, g_roll), new Cesium.Quaternion);
		var q_curr = Cesium.Quaternion.multiply(q_nadir, q_hpr, new Cesium.Quaternion);

		sampledOrientation[i].addSample(jd_time, q_curr);	
	}
	start_counter++;
	if (start_counter > 4 && start_counter < 6){
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

// toggle y thompson and nadir
Mousetrap.bind('y', function (e) {
    if (y_thompson) {
        y_thompson = false;
    }
    else {
        y_thompson = true;
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