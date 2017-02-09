var gl;
var canvas;
var shaderProgram;
var colorBuffer; 

var vertexPositionBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

var rot = quat.create([0.0, 0.0, 0.0, 1.0]);

var lastCamera = vec3.create();
lastCamera.set([0.0, 0.0, 3]);;


//the struct of plane
//-------------------------------------------------------------------------
var Plane = {
  coverEl: document.getElementById('cover'),
  contentEl: document.getElementById('content'),
  fullscreen: false,
  velocity: 0.001,
  rows: 100,
  cols: 100,
  gridSpacing: 2,
  left: false,
  right: false,
  up: false,
  down: false,
  turn_right: false,
  turn_left:  false,
  ac: false,
  de: false
}


//this function set up all 5 buffers in Terrain
//-------------------------------------------------------------------------
function setupTerrainBuffers() {
   
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    
    var cTerrain=[]; 
    var gridN=129;
    var max = 128;
    var heightArray = new Array(gridN);
    for(var i =0 ; i< gridN; i++){
        heightArray[i]= new Array(gridN);
    }
     heightArray[0][0] = 0;
    heightArray[max][0] = 0;
    heightArray[0][max] = 0;
    heightArray[max][max]=0;
   
   generateDiamondHeight(heightArray, 0,0,128,128, 128);
   
    var newSize=3;
    var numT = terrainFromIteration(gridN-1, -newSize,newSize,-newSize,newSize, vTerrain, fTerrain, nTerrain,heightArray);
    console.log("Generated ", numT, " triangles");
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
   
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
   
    // Specify faces of the terrain
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    
    // Specify color of the terrain   
    terrainFromIterationcolor(gridN-1,cTerrain,heightArray); 
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cTerrain),
                  gl.STATIC_DRAW);
    colorBuffer.itemSize = 3;
    colorBuffer.numItems = (gridN+1)*(gridN+1);
    
    
   
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
   
     
}


function initWebGL(canvas) {
  try {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (gl){
      // Initialize shaders and buffers.
      initShaders();
      initBuffers();

      // Enable depth testing.
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      // Fetch matrix uniforms that we can set later.
      getMatrixUniforms();

      // Establish viewport and perspective.
      gl.viewport(0, 0, canvas.width, canvas.height);
      mat4.perspective(45, canvas.width/canvas.height, 0.1, 100, pMatrix);

      // Begin animation loop.
      //draw();
    }
  }
  catch (e){}

  if (!gl) alert(
      "Unable to initialize WebGL. Your browser may not support it.");

  return gl;
}
//-------------------------------------------------------------------------
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);  
  
  // Bind color buffer 
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
   
 //Draw
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}


// this function uses the verticies to draw terrain edges
//-------------------------------------------------------------------------
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);  
   
 //Draw
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

// this function upload mvMatrixUniform to shader
//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

// this function upload pMatrixUniform to shader
//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

// this function upload nMatrixUniform to shader
//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//this function pushes the current Matrix
//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

//this function pops the current Matrix 
//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//this function set the current Matrix to be uniform 
//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//this function converts degrees to Rad
//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}


//sets up the GL context using canvas
//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}


//helper function that compiles the shader and checks if there were compilation errors
//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
 
  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }
 
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

//this function creates a program object and attach the compiled shaders and link
//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
 
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    
  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor2");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//this function set light component with a,d,s,loc 
//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//this function set materical component with a,d,s 
//-------------------------------------------------------------------------
function uploadMaterialToShader(a,d,s) {
  gl.uniform3fv(shaderProgram.uniformAmbientMatColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMatColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMatColorLoc, s);
}


//this function call setupTerrainBuffers(); 
//----------------------------------------------------------------------------------
function setupBuffers() {
    setupTerrainBuffers();
}

//this function helps us draw the scene 
//----------------------------------------------------------------------------------
function draw() {
    var transformVec = vec3.create();
 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up); 
 
    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-3.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25)); 
    
    setMatrixUniforms();
   if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    {
      uploadLightsToShader([1,1,2],[0.2,0.4,0.4],[1.0,0.5,0.0],[0.0,0.0,1.0]);
      drawTerrain();
    }
    
    if(document.getElementById("wirepoly").checked){
      uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }
    mvPopMatrix();
 
}


//this function helps us pitch up or down 
//----------------------------------------------------------------------------------
function pitch(degree) {
  //convert the degree to radian using provided function
  var rad = degToRad(degree);
  //create a working quaternion object
  var workingQuat = quat.create();
  var vecTemp = vec3.create();
  vec3.cross(vecTemp, viewDir, up);

  //use quat.setAxisAngle to update workingQuat with a yaw rotation (about y axis)
  quat.setAxisAngle(workingQuat, vecTemp, rad);
 
  //normalize resulting quat and update workingquat with a rotation
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize resulting quaternion
  quat.normalize(rot, rot);

  //update the view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);
}

//this function helps us roll right or left 
//----------------------------------------------------------------------------------
function roll(degree) {
  //convert the degree to radian using provided function
  var rad = degToRad(degree);
  //create a working quaternion object
  var workingQuat = quat.create();
  var vecTemp = vec3.create();
  vec3.cross(vecTemp, viewDir, up);    
    
    
  //use quat.setAxisAngle to update workingQuat with a yaw rotation (about y axis)
  quat.setAxisAngle(workingQuat, viewDir, rad);

  //normalize resulting quat and update workingquat with a rotation
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize resulting quaternion
  quat.normalize(rot, rot);

  //update the view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);
}

//this function helps us turn right or left directions
//----------------------------------------------------------------------------------
function turn(degree) {
    //convert the degree to radian using provided function
  var rad = degToRad(degree);
  //create a working quaternion object
  var workingQuat = quat.create();
  //use quat.setAxisAngle to update workingQuat with a yaw rotation (about z axis)
  quat.setAxisAngle(workingQuat, up, rad);

  //normalize resulting quat and update workingquat with a rotation
  quat.normalize(workingQuat, workingQuat);
  quat.multiply(rot, rot, workingQuat);

  //normalize resulting quaternion
  quat.normalize(rot, rot);

  //update the view matrix
  vec3.transformQuat(up, up, rot);
  vec3.transformQuat(viewDir, viewDir, rot);    
}

//this function add animation to the scene
//----------------------------------------------------------------------------------
function animate() {
   // Get the current direction.
  vec3.normalize(viewDir, viewDir);
 
  vec3.scale(viewDir, viewDir, Plane.velocity);

  // Save the last camera position.
  lastCamera.set(eyePt);

  // Normalize the up vector before applying scaling.
  vec3.normalize(up, up);

  // Apply rotation transformations to the direction vector.
  if (Plane.left){
    // Calculate the change after the left key is pressed
    roll(-4);
    console.log("it actually turned!");
  }

  else if (Plane.right){
    // Calculate the change after the left key is pressed
    roll(4);
    console.log("it turned right!");
  }

  if (Plane.up){
    // Calculate the change after the left key is pressed
    pitch(4);
    console.log("it pitched up");
  }

  else if (Plane.down){
    // Calculate the change after the left key is pressed  
    pitch(-4);
    console.log("it pitched down!");
  }
    
  if (Plane.turn_right){
    turn(-0.1);  
  }
  else if(Plane.turn_left){
    turn(0.1);   
  }
  if (Plane.ac){
     Plane.velocity=Plane.velocity*1.01; 
  }
  else if(Plane.de){
     Plane.velocity=Plane.velocity*0.99; 
  }

  // Update the current vector
  vec3.add(eyePt, eyePt, viewDir);
}

//start up function for js file 
//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//help function of request animation frame, refresh every 1/60 second 
//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}



/**
 * Trigger flight controls for navigation when arrow keys and    "wasd" are pressed.
 *
 * @param {Event} e The keyseydown event.
 */
//----------------------------------------------------------------------------------
document.onkeydown = function (e){
  if (e.keyCode === 37) {
    //move left
    Plane.left = true;
    Plane.right = false;
    console.log("it moved left")
  } else if (e.keyCode === 38) {
    //move up
    Plane.up = true;
    Plane.down = false;
    console.log("it moved up");
  } else if (e.keyCode === 39) {
    //move right
    Plane.left = false;
    Plane.right = true;
    console.log("it moved right");
  } else if (e.keyCode === 40) {
    //move down
    Plane.up = false;
    Plane.down = true;
    console.log("it moved down");
  }
    
    else if (e.keyCode === 65) {
    //turn left
    Plane.turn_left = true;
    Plane.turn_right = false;
    console.log("turn left");
  }else if (e.keyCode === 68) {
    //move right
    Plane.turn_left = false;
    Plane.turn_right = true;
    console.log("turn right");
  }
    else if (e.keyCode === 87) {
    //acc
    Plane.ac = true;
    Plane.de = false;   
    console.log("ac");
  }else if (e.keyCode === 83) {
    //dece
    Plane.ac = false;
    Plane.de = true;   
    console.log("dec");
  }
    
    
    
    
    
}

/**
 * Trigger flight controls for navigation when arrow keys and "wasd" are pressed.
 *
 * @param {Event} e The keyseyup event.
 */
document.onkeyup = function (e){
  if (e.keyCode === 37) {
    //move left
    Plane.left = false;
  } else if (e.keyCode === 38) {
    //move up
    Plane.up = false;
  } else if (e.keyCode === 39) {
    //move right
    Plane.right = false;
  } else if (e.keyCode === 40) {
    //move down
    Plane.down = false;
  } else if (e.keyCode === 65) {
    //turn left
    Plane.turn_left = false; 
  }else if (e.keyCode === 68) {
    //move right
    Plane.turn_right = false;
  }else if (e.keyCode === 87) {
    //turn left
    Plane.ac = false; 
  }else if (e.keyCode === 83) {
    //move right
    Plane.de = false;
  }
    
  if ((e.keyCode >= 37 && e.keyCode <= 40) || e.keyCode === 68 || e.keyCode === 65) {
    rot = quat.create([0.0, 0.0, 0.0, 1.0]);
  }
}




