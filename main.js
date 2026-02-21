console.log("Testing Mapbox style...");

// Replace with your Mapbox access token
const MAPBOX_PROJECT_TOKEN = "pk.eyJ1IjoiamF0a2kiLCJhIjoiY21sdnRhazkwMGMxbDNlb21ubWIxdTR2ZCJ9.bwpZOXMQ7_au4wwnMb8rog";  

// Create Cesium viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
    imageryProvider: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    animation: false,
    timeline: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false
});

// Cesium Editing
viewer.scene.globe.enableLighting = false;
viewer.scene.globe.showGroundAtmosphere = false;
viewer.scene.skyAtmosphere.show = false;
viewer.scene.fog.enabled = false;
viewer.scene.skyBox.show = false;
viewer.scene.backgroundColor = Cesium.Color.WHITE;
viewer.scene.sun.show = false;
viewer.scene.moon.show = false;

viewer.scene.postProcessStages.add(
    Cesium.PostProcessStageLibrary.createSilhouetteStage()
);

// Mapbox Raster Style Provider
const mapboxProvider = new Cesium.MapboxStyleImageryProvider({
    username: "jatki",
    styleId: "cmlswm6sg001901r49d19513t",
    accessToken: MAPBOX_PROJECT_TOKEN,
    scaleFactor: true
});

mapboxProvider.errorEvent.addEventListener(error => {
    console.error("Mapbox imagery error:", error);
});

viewer.imageryLayers.addImageryProvider(mapboxProvider);

viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(20, 20, 20000000)
});


// Polygon hierarchy
function rebuildPolygon(entity) {
    const hierarchy = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());
    return new Cesium.PolygonHierarchy(
        hierarchy.positions,
        hierarchy.holes
    );
}

let backgroundDataSource;
let fillDataSource;
let countryIndex = {};
let selectedCountry = null;


// Outline polygon
Cesium.GeoJsonDataSource.load("worldcountries.geojson", {
    clampToGround: true
}).then(function (dataSource) {

    backgroundDataSource = dataSource;
    viewer.dataSources.add(dataSource);

    const entities = dataSource.entities.values;

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];

        if (entity.polygon) {
            entity.polygon.hierarchy = rebuildPolygon(entity);
            entity.polygon.arcType = Cesium.ArcType.GEODESIC;
            entity.polygon.material = Cesium.Color.BLACK;
        }
    }
});


// Fill polygon
Cesium.GeoJsonDataSource.load("worldcountriesfill.geojson", {
    clampToGround: true
}).then(function (dataSource) {

    fillDataSource = dataSource;
    viewer.dataSources.add(dataSource);

    const entities = dataSource.entities.values;

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];

        if (entity.polygon) {

            entity.polygon.hierarchy = rebuildPolygon(entity);
            entity.polygon.arcType = Cesium.ArcType.GEODESIC;
            entity.polygon.material =
                Cesium.Color.fromCssColorString("#cccccc").withAlpha(1);
            entity.polygon.outline = false;

            // Build country index
            const countryName = entity.properties.name.getValue();

            if (!countryIndex[countryName]) {
                countryIndex[countryName] = [];
            }

            countryIndex[countryName].push(entity);
        }
    }
});


// Click interaction
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

handler.setInputAction(function (click) {

    const pickedObject = viewer.scene.pick(click.position);
    if (!Cesium.defined(pickedObject)) return;

    const entity = pickedObject.id;

    // Only allow interaction with fill dataset
    if (!fillDataSource || !fillDataSource.entities.contains(entity)) return;

    const countryName = entity.properties.name.getValue();

    // Highlight selected country
    countryIndex[countryName].forEach(e => {
        e.polygon.material =
            Cesium.Color.fromCssColorString("#128f5fff").withAlpha(1);
    });

    selectedCountry = countryName;

    console.log("Selected country:", countryName);

}, Cesium.ScreenSpaceEventType.LEFT_CLICK);