let angle = 45.0;
let myImage;
let ColorCount = 5;
let ColorScheme = [];

function distance(dataPoint1, dataPoint2)
{
  return Math.sqrt(Math.pow(dataPoint1.r - dataPoint2.r, 2) + Math.pow(dataPoint1.g - dataPoint2.g, 2) + Math.pow(dataPoint1.b - dataPoint2.b, 2));
}

function FindColorScheme()
{
  // data to vertices
  var pixeldata = [];
  var index = 0;
  for (var y = 0; y < myImage.height; y += 1)
  {
    for (var x = 0; x < myImage.width; x += 1)
    {
      var r = myImage.pixels[index];
      var g = myImage.pixels[index + 1];
      var b = myImage.pixels[index + 2];
      pixeldata[index / 4] = { r, g, b };
      index += 4;
    }
  }

  // Find centroids
  var centroids = [];
  switch (ColorCount)
  {
    case 1: // middle point
      centroids[0] = pixeldata[pixeldata.length / 2];
      break;
    case 2: // vertical split in two take middle of each side
      centroids[0] = pixeldata[myImage.width * (myImage.height / 2) + (myImage.width / 3)];
      centroids[1] = pixeldata[myImage.width * (myImage.height / 2) + (myImage.width / 3 * 2)];
      break;
    case 3: // vertical split in three equal rects and take pixel in the middle
      centroids[0] = pixeldata[myImage.width * (myImage.height / 2) + (myImage.width / 4)];
      centroids[1] = pixeldata[myImage.width * (myImage.height / 2) + (myImage.width / 4 * 2)];
      centroids[2] = pixeldata[myImage.width * (myImage.height / 2) + (myImage.width / 4 * 3)];
      break;
    case 4: // split vertical in two and horizontal in two equal rects and take middle pixels
      centroids[0] = pixeldata[myImage.width * (myImage.height / 3) + (myImage.width / 3)];
      centroids[1] = pixeldata[myImage.width * (myImage.height / 3) + (myImage.width / 3 * 2)];
      centroids[2] = pixeldata[myImage.width * (myImage.height / 3 * 2) + (myImage.width / 3)];
      centroids[3] = pixeldata[myImage.width * (myImage.height / 3 * 2) + (myImage.width / 3 * 2)];
      break;
    case 5: // take middle pixel of three equal rects on the upper half and pixels of two in the lower half
      centroids[0] = pixeldata[myImage.width * (myImage.height / 3) + (myImage.width / 4 * 1)];
      centroids[1] = pixeldata[myImage.width * (myImage.height / 3) + (myImage.width / 4 * 2)];
      centroids[2] = pixeldata[myImage.width * (myImage.height / 3) + (myImage.width / 4 * 3)];
      centroids[3] = pixeldata[myImage.width * (myImage.height / 3 * 2) + (myImage.width / 3 * 1)];
      centroids[4] = pixeldata[myImage.width * (myImage.height / 3 * 2) + (myImage.width / 3 * 2)];
      break;
  }

  // kmeans
  var pointToCentroid = new Array(pixeldata.length);
  var changedCentroids = true;
  for (var iteration = 0; iteration < 50 && changedCentroids; iteration++)
  {
    changedCentroids = false;
    for (var i = 0; i < pixeldata.length; i++)
    {
      // find closest centroid
      var min = 500;
      var minIndex = 0;
      for (var c = 0; c < centroids.length; c++)
      {
        var dist = distance(pixeldata[i], centroids[c]);
        if (dist < min)
        {
          min = dist;
          minIndex = c;
        }
      }
      pointToCentroid[i] = minIndex;
    }
    // Reposition centroid
    for (var c = 0; c < centroids.length; c++)
    {
      var newCentroid = { r: 0, g: 0, b: 0 };
      var assigendCount = 0;
      for (var a = 0; a < pointToCentroid.length; a++)
      {
        if (pointToCentroid[a] == c)
        {
          newCentroid.r += pixeldata[a].r;
          newCentroid.g += pixeldata[a].g;
          newCentroid.b += pixeldata[a].b;
          assigendCount += 1;
        }
      }
      newCentroid.r = newCentroid.r / assigendCount;
      newCentroid.g = newCentroid.g / assigendCount;
      newCentroid.b = newCentroid.b / assigendCount;
      if (newCentroid.r != centroids[c].r || newCentroid.g != centroids[c].g || newCentroid.b != centroids[c].b)
      {
        changedCentroids = true;
        centroids[c] = newCentroid;
      }
    }
  }
  ColorScheme = centroids;
}

function setup()
{
  createCanvas(800, 1200, 'webgl');
  myImage.loadPixels();

  FindColorScheme();

  noFill();
}

function preload()
{
  myImage = loadImage('assets/Test maya.jpg');
}

function draw() 
{
  angle += Math.PI / 360;
  background(255);
  image(myImage, -(width / 2) + 20, -(height / 2) + 10, 400, 200);
  for (var c = 0; c < ColorScheme.length; c++)
  {
    noStroke();
    fill(ColorScheme[c].r, ColorScheme[c].g, ColorScheme[c].b);
    rect(-(width / 2) + (width / ColorScheme.length * c), +(height / 2) - 200, width / ColorScheme.length, 200);
  }
  push();
  rotateX(45);
  rotateZ(angle);
  scale(1.8, 1.8, 1.8);

  // Plot a three-dimensional function
  var index = 0;
  for (var y = 0; y < myImage.height; y += 1)
  {
    for (var x = 0; x < myImage.width; x += 1)
    {
      beginShape(POINTS);
      var r = myImage.pixels[index];
      var g = myImage.pixels[index + 1];
      var b = myImage.pixels[index + 2];
      var a = myImage.pixels[index + 3];
      stroke(r, g, b);
      r -= 127;
      g -= 127;
      b -= 127;
      vertex(r, g, b);
      index += 4;
      endShape();
    }
  }
  noFill();
  //stroke(0);
  //box(255, 255, 255);

  stroke(255, 0, 0)
  line(-127, -127, -127, 127, -127, -127);

  stroke(0, 255, 0);
  line(-127, -127, -127, -127, 127, -127);

  stroke(0, 0, 255);
  line(-127, -127, -127, -127, -127, 127);

  pop();
}