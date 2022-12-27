function setup()
{
  canvas = createCanvas(600, 600);
  canvas = canvas.canvas.getContext('2d');
}

let bild;
let imageData;
let imagePixels = {width : 500, height : 200}
let canvas;


function preload()
{
  bild = new Image();
  bild.onload = function ()
  {
    imagePixels.width = 200;
    imagePixels.height = 200 * bild.height / bild.width;
    var canvas = document.createElement('canvas');
    canvas.width = imagePixels.width;
    canvas.height = imagePixels.height;
    var context = canvas.getContext('2d');
    context.drawImage(bild, 0, 0, imagePixels.width, imagePixels.height);
    imageData = context.getImageData(0, 0, imagePixels.width, imagePixels.height).data;
    document.body.appendChild(canvas);
    document.body.appendChild(bild);
  };
  bild.src = "https://www.artic.edu/iiif/2/0377f007-2251-af1f-e997-ac44217b6651/full/843,/0/default.jpg";
  bild.setAttribute('crossOrigin', 'Anonymous');
}
function draw()
{
  background(220);
  noStroke();
  if (imageData != null)
  {
    /*var index = 0;
    for (var y = 0; y < imagePixels.height; y += 1)
    {
      for (var x = 0; x < imagePixels.width; x += 1)
      {
        fill(imageData[index], imageData[index + 1], imageData[index + 2], imageData[index + 3]);
        rect(x, y, 1, 1);
        index += 4;
      }
    }*/
    canvas.drawImage(bild, 0, 0, imagePixels.width, imagePixels.height);
  }
}