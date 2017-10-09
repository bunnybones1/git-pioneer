var createGeometry = require('three-bmfont-text');
var loadFont = require('load-bmfont');

loadFont('fonts/DejaVu-sdf.fnt', function(err, font) {
  // create a geometry of packed bitmap glyphs, 
  // word wrapped to 300px and right-aligned
  var geometry = createGeometry({
    width: 300,
    align: 'right',
    font: font
  })

  // change text and other options as desired
  // the options sepcified in constructor will
  // be used as defaults
  geometry.update('Lorem ipsum\nDolor sit amet.')
  
  // the resulting layout has metrics and bounds
  console.log(geometry.layout.height)
  console.log(geometry.layout.descender)
    
  // the texture atlas containing our glyphs
  var textureLoader = new THREE.TextureLoader();
  textureLoader.load('fonts/DejaVu-sdf.png', function (texture) {
    // we can use a simple ThreeJS material
    var material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      color: 0xaaffff
    })

    // now do something with our mesh!
    var mesh = new THREE.Mesh(geometry, material)
  })
})