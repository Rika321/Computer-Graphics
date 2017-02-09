//this function fills the colorbuffer with heightArray 
//-------------------------------------------------------------------------
function terrainFromIterationcolor(n, color,heightArray){
     for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           var temp = heightArray[j][i];
           color.push(temp/50);
           color.push(0);
           color.push(0);
       }
}


//this function fills the vertexArray and naArray  
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,naArray,heightArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(heightArray[j][i]);
           
           naArray.push(0);
           naArray.push(0);
           naArray.push(1);
       }
    generateNormals(heightArray, naArray, n, deltaX, deltaY);

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}


//this function takes an argument of a height map and then fills it in using the diamond square method
//-------------------------------------------------------------------------------------------------------
function generateDiamondHeight(heightArray, minX, minY,  maxX, maxY, step){
 if(step>0){
    var height1 = heightArray[minX][minY];
    var height2 = heightArray[minX][maxY];
    var height3 = heightArray[maxX][minY];
    var height4 = heightArray[maxX][maxY];
     step = Math.floor(step/2);
    var middleX = minX+step;
    var middleY = minY+step;
   
    heightArray[middleX][middleY] = (height1+height2+height3+height4)/4 + Math.random()*0.05;
   var height5 = heightArray[middleX][middleY];
        heightArray[minX][middleY] = (height1+height2 +height5)/3 + Math.random()*0.05;
        heightArray[maxX][middleY] = (height3+height5 + height4)/3 +Math.random()*0.05;
        heightArray[middleX][minY] = (height1+height3+height5)/3+Math.random()*0.05;
        heightArray[middleX][maxY] = (height4+ height2+height5)/3+Math.random()*0.05;
        
        generateDiamondHeight(heightArray, minX, minY, middleX, middleY, step);
        generateDiamondHeight(heightArray, middleX, minY, maxX, middleY, step);
        generateDiamondHeight(heightArray, minX, middleY, middleX, maxY, step);
        generateDiamondHeight(heightArray, middleX, middleY, maxX, maxY, step);
 }
}

//  function uses the faceArray to fill the lineArray
//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}


//  function takes a empty normal arry and filled in with heightArray to 
//  determine the normals for the light values 
//  cite from mgarg5
//-------------------------------------------------------------------------
function generateNormals(heightArray, naArray, n, deltaX, deltaY)
{
  var vec1 = vec3.create();
  var vec2 = vec3.create();
  var t1 = vec3.create();
  var t2 = vec3.create();
  var cross = vec3.create();

  for(var i=0;i< n;i++)
   for(var j=0;j< n;j++)
   {
      /* current index in a 1D array */
      var vid = i*(n+1) + j;
      /*vectors of the points in the square are used to compute two normal 
      from two faces */
      vec3.set(vec1, deltaX, 0, heightArray[i][j+1] - heightArray[i][j]);
      vec3.set(vec2, 0, deltaY, heightArray[i+1][j] - heightArray[i][j]);
      vec3.cross(cross, vec1, vec2);

      vec3.set(t1, -deltaX, 0, heightArray[i+1][j] - heightArray[i+1][j+1]);
      vec3.set(t2, 0, -deltaY, heightArray[i][j+1] - heightArray[i+1][j+1]);
      vec3.cross(t1, t1, t2);

      /* normals are summed to all points used */
      naArray[3*vid] += cross[0];
      naArray[(3*vid)+1] += cross[1];
      naArray[(3*vid)+2] += cross[2];

      naArray[3*(vid+n+1)] += cross[0] + t1[0];
      naArray[(3*(vid+n+1))+1] += cross[1] + t1[1];
      naArray[(3*(vid+n+1))+2] += cross[2] + t1[2];

      naArray[3*(vid+1)] += cross[0] + t1[0];
      naArray[(3*(vid+1))+1] += cross[1] + t1[1];
      naArray[(3*(vid+1))+2] += cross[2] + t1[2];

      naArray[3*(vid+n+2)] += cross[0];
      naArray[(3*(vid+n+2))+1] += cross[1];
      naArray[(3*(vid+n+2))+2] += cross[2];
   }
  
  /* length is computed to normalize the vectors stored in the normal array */
  var legth  = 0;
  for(var i=0;i<n;i++)
   for(var j=0;j<n;j++)
   {
    var vid = i*(n+1) + j;
    length = Math.sqrt(Math.pow(naArray[3*vid],2) + Math.pow(naArray[3*vid + 1],2) + Math.pow(naArray[3*vid + 2],2));
    naArray[3*vid] = naArray[3*vid] / length;
    naArray[3*vid + 1] = naArray[3*vid + 1] / length;
    naArray[3*vid + 2] = naArray[3*vid + 2] / length;
  }

}


