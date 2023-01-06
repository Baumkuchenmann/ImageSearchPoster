//#region Properties
const PosterStates =
{
  SourceSelection: 0,
  SourceFilterTransition: 1,
  FilterSelection: 2,
  FilterPosterTransition: 3,
  PosterView: 4
}

// Color Properties. Need to be instantiated in the setup function
let ButtonColor;
let HoverColor;
let TextColor;
let BoxColor;
let InactiveColor;
let BackgroundColor;
let BottomColor;
let BottomTextColor;
let ControlColor;

 // Text Properties
let CustomFont;
let HeaderFontSize = 38;
let SubHeaderFontSize = 25;
let NormalFontSize = 12;

//CheckBox variables
let AIoCSourceSelected = true;
let ColorSchemeFilterSelected = true;
let SearchTermSelected = false;

let AIoCImage;
let QrCode;

let CanvasContext; // To render images from urls on screen

let ExportScale = 6.25; // export scale factor. Based on A4 with 96 dpi should result in A2 with 300 dpi

let CurrentState = PosterStates.SourceSelection;

let BottomTextHeight = 10; // in percent of height.

let MouseDown = false; // Only set to true for one draw cycle if the mouse was pressed.
let MouseWasDown = false; // Helper variable
let MovingColorsSlider = false; // Helper for silder functionality in filter selection.

let PictureRows = 6; // Defines how many rows of pictures sould be drawn one the poseter view.

let Finished = false; // Flag set to true if the poster received enough picture to fill the poster.

// Source Needed Function:
// Start()
// Stop()
// Required Properties:
// WithSearchTerm
// SearchTerm
let Sources = [];

// Filter objects need the method:
// Check returning a bool
let Filters = [];

// Format for picture objects
// Properties:
// SourcePicture  Object of type picture.
// Pixels as two array of objects with Properties R, G, B
// PixelWidth
// PixelHeight
let Pictures = [];

//DOM elements
var ColorPickers = [];
var UrlTextBox;
var UrlButton;
var SearchTermBox
//#endregion

//#region Setup

function preload()
{
  CustomFont = loadFont("assests\\Karrik-Regular.otf");
  //https://lh3.googleusercontent.com/ci/AC_FhM9QeeCRXkEuMuILA7EQgh43ddYVS7USQgnghZ2yXR1_9mqe-8DGt1PtmjbvSy9rnf9hl9LuR58
  AIoCImage = loadImage("assests\\AIoC Logo.png");
  QrCode = loadImage("assests\\GitHub QR Code.svg");

}

function setup()
{
  // Set colors
  ButtonColor = color(92, 102, 235);
  HoverColor = color(164, 169, 238);
  ControlColor = color(67, 100, 117);
  TextColor = color(0, 0, 0);
  BoxColor = color(232, 242, 255);
  InactiveColor = color(224); 
  BackgroundColor = color(245);
  BottomColor = color(200);
  BottomTextColor = color(100);
  
  for (var i = 0; i < ColorSchemeFilter.MaxColorCount; i++)
  {
    ColorPickers[i] = createColorPicker('#ffffffff');
    ColorPickers[i].hide();
  }
  SearchTermBox = createInput("");
  SearchTermBox.style("font-size", NormalFontSize + "px");
  SearchTermBox.hide();
  UrlTextBox = createInput("Image Url to load Color Scheme");
  UrlTextBox.style("font-size", NormalFontSize + "px");
  UrlTextBox.hide();
  UrlButton = createButton("Load");
  UrlButton.style("font-size", NormalFontSize + "px");
  UrlButton.style("background-color", ButtonColor);
  UrlButton.style("border", "none");
  UrlButton.mousePressed(() =>
  {
    var Picture = new Image();
    Picture.onload = () => 
    { 
      // Get data
        var canvas = document.createElement('canvas');
        canvas.width = Picture.width;
        canvas.height = Picture.height;
        var context = canvas.getContext('2d');
        context.drawImage(Picture, 0, 0, Picture.width, Picture.height);
        var imageData = context.getImageData(0, 0, Picture.width, Picture.height).data;

        // data to vertices
        var pixeldata = [];
        var index = 0;
        for (var y = 0; y < Picture.width; y += 1)
        {
          for (var x = 0; x < Picture.height; x += 1)
          {
            var r = imageData[index];
            var g = imageData[index + 1];
            var b = imageData[index + 2];
            pixeldata[index / 4] = { R: r, G: g, B: b };
            index += 4;
          }
        }

        var scheme = ColorSchemeFilter.FindColorScheme(pixeldata, Picture.width, Picture.height);
        for (var i = 0; i < scheme.length; i++)
        {
          var c = color(scheme[i].R, scheme[i].G, scheme[i].B, 255);
          ColorSchemeFilter.ColorScheme[i] = scheme[i];
          ColorPickers[i].elt.value = ConvertFromSchemeColor(scheme[i]);
        }
    };
    Picture.src = UrlTextBox.value();
    Picture.setAttribute('crossOrigin', 'Anonymous');
  });
  UrlButton.hide();

  // Create Canvas
  CanvasContext = createCanvas(794, 1123); // a4 with 96 dpi
  CanvasContext = CanvasContext.canvas.getContext("2d");
}

//#endregion

//#region Sources

// Source for Pictures from Art Institue of Chicago API https://api.artic.edu/docs/
let AIoCSource =
{
  BaseUrl : "",
  Page : 1,
  JsonResponse : null,
  ImageIds : [],
  ImageIdsIndex : 0,
  Picture : null,
  Stopping : false,

  WithSearchTerm : false,
  SearchTerm : "",

  ImagePixels : { Width: 200, Height: 200 }, // Resize size to get pixel Data from
  RenderCanvas : null,
  RenderContext : null,

  // Starts to get images from the image ids.
  Start : function()
  {
    if (this.ImageIdsIndex >= this.ImageIds.length)
    {
      // Loads new ids
      this.RenderCanvas = document.createElement('canvas');
      this.RenderContext = this.RenderCanvas.getContext('2d');
      if (this.WithSearchTerm)
      {
        this.BaseUrl = "https://api.artic.edu/api/v1/artworks/search?page=" + this.Page + "&limit=100&fields=image_id,id&q=" + this.SearchTerm
      }
      else
      {
        this.BaseUrl = "https://api.artic.edu/api/v1/artworks?page=" + this.Page + "&limit=100&fields=image_id,"
      }
      this.Page++;
      var self = this;
      loadJSON(this.BaseUrl, (response) => // Parse json data function.
      {
        self.JsonResponse = response;
        self.ImageIds = [];
        self.ImageIdsIndex = 0;
        var index = 0;
        for (var i = 0; i < self.JsonResponse.data.length; i++)
        {
          if (self.JsonResponse.data[i].image_id != null)
          {
            self.ImageIds[index] = self.JsonResponse.data[i].image_id;
            index++;
          }
        }
        // Implement handling when last page is reached.
        self.Start();
      });
    }
    else
    {
      // Gets the current image from loaded ids.
      this.Picture = new Image();
      var self = this;
      this.Picture.onload = () => 
      { // callback when the picture has loaded.
        if (!self.Stopping)
        {
          self.ImagePixels.Height = self.ImagePixels.Width * self.Picture.height / self.Picture.width;
          self.RenderCanvas.width = self.ImagePixels.Width;
          self.RenderCanvas.height = self.ImagePixels.Height;
          self.RenderContext.drawImage(self.Picture, 0, 0, self.ImagePixels.Width, self.ImagePixels.Height);
          var imageData = self.RenderContext.getImageData(0, 0, self.ImagePixels.Width, self.ImagePixels.Height).data;
    
          // data to vertices
          var pixeldata = [];
          var index = 0;
          for (var y = 0; y < self.ImagePixels.Width; y += 1)
          {
            for (var x = 0; x < self.ImagePixels.Height; x += 1)
            {
              var r = imageData[index];
              var g = imageData[index + 1];
              var b = imageData[index + 2];
              if (r == undefined || g == undefined || b == undefined)
              {
                break;
              }
              pixeldata[index / 4] = { R: r, G: g, B: b };
              index += 4;
            }
          }
          var img =
          {
            SourcePicture: self.Picture,
            Pixels: pixeldata,
            PixelWidth : self.ImagePixels.Width,
            PixelHeight : self.ImagePixels.Height
          }
          ApplyFilter(img);
    
          self.Start();
        }
      };
      this.Picture.onerror = () => 
      {
        self.Start();
      }
      this.Picture.src = "https://www.artic.edu/iiif/2/" + this.ImageIds[this.ImageIdsIndex] + "/full/843,/0/default.jpg";
      this.Picture.setAttribute('crossOrigin', 'Anonymous');
      this.ImageIdsIndex++;
    }
  },

  Stop : function()
  {
    this.Stopping = true;
  }
}

//#endregion

//#region Filter

let ColorSchemeFilter =
{
  ColorScheme: [], // Given Scheme to compare
  ColorCount: 5, // Number of colors in color scheme
  MaxColorCount : 5,
  MinColorCount : 1,
  Precision: 0.85, // from 0 - 1 for %

  // Checks if the picture has a similar color scheme as the compare scheme
  Check(picture) 
  {
    var precisionRange = 255 * (1 - this.Precision); // Check range is rgb value +- this
    var scheme = this.FindColorScheme(picture.Pixels, picture.PixelWidth, picture.PixelHeight); 
    var arrayIndices = this.ArrayCombination(scheme.length);
    for (var perm = 0; perm < arrayIndices.length; perm++)
    {
      var found = true;
      for (var s = 0; s < scheme.length; s++)
      {
        if (!(scheme[arrayIndices[perm][s]].R >= this.ColorScheme[s].R - precisionRange && scheme[arrayIndices[perm][s]].R <= this.ColorScheme[s].R + precisionRange &&
          scheme[arrayIndices[perm][s]].G >= this.ColorScheme[s].G - precisionRange && scheme[arrayIndices[perm][s]].G <= this.ColorScheme[s].G + precisionRange &&
          scheme[arrayIndices[perm][s]].B >= this.ColorScheme[s].B - precisionRange && scheme[arrayIndices[perm][s]].B <= this.ColorScheme[s].B + precisionRange))
        {
          found = false;
          break;
        }
      }
      if (found)
      {
        return true;
      }
    }
    print("Loaded image did not pass the Color Scheme Filter");
    return false;
  },

  Permutations(array)
  { 
      var results = [];
      function permute(arr, memo)
      {
        memo = memo ?? [];
        for (var i = 0; i < arr.length; i++)
        {
          var cur = arr.splice(i, 1);
          if (arr.length === 0) 
          {
            results.push(memo.concat(cur));
          }
          permute(arr.slice(), memo.concat(cur));
          arr.splice(i, 0, cur[0]);
        }
        return results;
      }
      return permute(array);
  },

  ArrayCombination(arrayLength)
  {
    var indices = [];
    for (var i = 0; i < arrayLength; i++)
    {
      indices[i] = i;
    }
    return this.Permutations(indices);
  },

  Distance(dataPoint1, dataPoint2)
  {
    return Math.sqrt(Math.pow(dataPoint1.R - dataPoint2.R, 2) + Math.pow(dataPoint1.G - dataPoint2.G, 2) + Math.pow(dataPoint1.B - dataPoint2.B, 2));
  },

  FindColorScheme(pixeldata, imageWidth, imageHeight)
  {
    // Find centroids
    var centroids = [];
    switch (this.ColorCount)
    {
      case 1: // middle point
        centroids[0] = pixeldata[Math.round(pixeldata.length / 2)];
        break;
      case 2: // vertical split in two take middle of each side
        centroids[0] = pixeldata[Math.round(imageWidth * (imageHeight / 2) + (imageWidth / 3))];
        centroids[1] = pixeldata[Math.round(imageWidth * (imageHeight / 2) + (imageWidth / 3 * 2))];
        break;
      case 3: // vertical split in three equal rects and take pixel in the middle
        centroids[0] = pixeldata[Math.round(imageWidth * (imageHeight / 2) + (imageWidth / 4))];
        centroids[1] = pixeldata[Math.round(imageWidth * (imageHeight / 2) + (imageWidth / 4 * 2))];
        centroids[2] = pixeldata[Math.round(imageWidth * (imageHeight / 2) + (imageWidth / 4 * 3))];
        break;
      case 4: // split vertical in two and horizontal in two equal rects and take middle pixels
        centroids[0] = pixeldata[Math.round(imageWidth * (imageHeight / 3) + (imageWidth / 3))];
        centroids[1] = pixeldata[Math.round(imageWidth * (imageHeight / 3) + (imageWidth / 3 * 2))];
        centroids[2] = pixeldata[Math.round(imageWidth * (imageHeight / 3 * 2) + (imageWidth / 3))];
        centroids[3] = pixeldata[Math.round(imageWidth * (imageHeight / 3 * 2) + (imageWidth / 3 * 2))];
        break;
      case 5: // take middle pixel of three equal rects on the upper half and pixels of two in the lower half
        centroids[0] = pixeldata[Math.round(imageWidth * (imageHeight / 3) + (imageWidth / 4 * 1))];
        centroids[1] = pixeldata[Math.round(imageWidth * (imageHeight / 3) + (imageWidth / 4 * 2))];
        centroids[2] = pixeldata[Math.round(imageWidth * (imageHeight / 3) + (imageWidth / 4 * 3))];
        centroids[3] = pixeldata[Math.round(imageWidth * (imageHeight / 3 * 2) + (imageWidth / 3 * 1))];
        centroids[4] = pixeldata[Math.round(imageWidth * (imageHeight / 3 * 2) + (imageWidth / 3 * 2))];
        break;
    }

    // Todo: Make centroids unique if same color is present

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
          var dist = this.Distance(pixeldata[i], centroids[c]);
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
        var newCentroid = { R: 0, G: 0, B: 0 };
        var assigendCount = 0;
        for (var a = 0; a < pointToCentroid.length; a++)
        {
          if (pointToCentroid[a] == c)
          {
            newCentroid.R += pixeldata[a].R;
            newCentroid.G += pixeldata[a].G;
            newCentroid.B += pixeldata[a].B;
            assigendCount += 1;
          }
        }
        if (assigendCount == 0)
        {
          continue;
        }
        newCentroid.R = newCentroid.R / assigendCount;
        newCentroid.G = newCentroid.G / assigendCount;
        newCentroid.B = newCentroid.B / assigendCount;
        if (newCentroid.R != centroids[c].R || newCentroid.G != centroids[c].G || newCentroid.B != centroids[c].B)
        {
          changedCentroids = true;
          centroids[c] = newCentroid;
        }
      }
    }
    return centroids;
  }
}

// Checks if the picture passes all filters
function ApplyFilter(picture)
{
  // Check all filters
  var valid = true;
  for (var i = 0; i < Filters.length; i++)
  {
    if (!Filters[i].Check(picture))
    {
      valid = false;
    }
  }

  // Add picture to list of rendered Pictures if all fitlers have passed
  if (valid)
  {
    Pictures[Pictures.length] = picture;
  }
}

function ConvertFromSchemeColor(colorScheme)
{
  return "#" + (Math.round(colorScheme.R)).toString(16).padStart(2, '0') + (Math.round(colorScheme.G)).toString(16).padStart(2, '0') + (Math.round(colorScheme.B)).toString(16).padStart(2, '0');
}

function ConvertToSchemeColor(color)
{
  return { R : color._getRed(), G : color._getGreen(), B : color._getBlue() }
}
//#endregion

//#region  Drawing

function draw() 
{
  // MouseHanding for buttons
  if (mouseIsPressed && !MouseWasDown)
  {
    MouseDown = true;
    MouseWasDown = true;
  }
  else if (mouseIsPressed && MouseWasDown)
  {
    MouseDown = false;
  }
  else if (!mouseIsPressed)
  {
    MouseDown = false;
    MouseWasDown = false;
  }

  // Draw state specific elements
  switch (CurrentState)
  {
    case PosterStates.SourceSelection:
      DrawSourceSelection();
      break;
    case PosterStates.SourceFilterTransition:
      DrawTransitionSourceFilter();
      break;
    case PosterStates.FilterSelection:
      DrawFilterSelection();
      break;
    case PosterStates.FilterPosterTransition:
      DrawTransitionFilterPoster();
      break;
    case PosterStates.PosterView:
      DrawPosterView();
      break;
  }
  // Info text at bottom
  DrawBottomText();
}

function DrawSourceSelection()
{
  background(BackgroundColor);
  push();

  // Draw Header Text
  var headerx = 0;
  var headery = height / 20;
  var headerWidht = width;
  var headerHeight = height / 5;
  textAlign(CENTER, TOP);
  textSize(HeaderFontSize);
  textFont(CustomFont);
  fill(TextColor);
  noStroke();
  text("Picture Sources", headerx, headery, headerWidht, headerHeight);

  // Art Istitue of Chicago 
  var aiocLogoWidth = width / 2;
  var aiocLogoHeight = aiocLogoWidth * (AIoCImage.width / AIoCImage.height);
  var aiocLogox = width / 2 - (aiocLogoWidth / 2);
  var aiocLogoy = height / 4;
  image(AIoCImage, aiocLogox, aiocLogoy, aiocLogoWidth, aiocLogoHeight);

  // Descriton
  var descriptionx = width/100;
  var descriptiony = height * 0.8;
  var descriptionWidth = width / 2;
  var descriptionHeight = height - descriptiony;
  textAlign(TOP, LEFT);
  textSize(NormalFontSize);
  textFont(CustomFont);
  fill(TextColor);
  noStroke();
  text("Gets pictures from the listed picture sources. Filters can be choosen on the next page. Filter by search term and filter by color scheme is available. All picture which passed the filter are arranged into a poster. Press \"s\" on the poster view to save the poster", descriptionx, descriptiony, descriptionWidth, descriptionHeight);
  // Description Header
  var descriptionHeaderx = descriptionx;
  var descpriptionHeaderWidth = descriptionWidth;
  var descriptionHeaderHeight = SubHeaderFontSize;
  var descriptionHeadery = descriptiony - SubHeaderFontSize - (height / 50);
  textAlign(LEFT, CENTER);
  textSize(SubHeaderFontSize);
  textFont(CustomFont);
  fill(TextColor);
  noStroke();
  text("Description", descriptionHeaderx, descriptionHeadery, descpriptionHeaderWidth, descriptionHeaderHeight);

  // Draw move to filter page button
  var buttonWidth = width / 5;
  var buttonHeight = height / 10;
  var buttonX = width - buttonWidth - (width / 10);
  var buttonY = height - buttonHeight - (height / BottomTextHeight) - (height / 20);
  fill(ButtonColor);
  // Hit test for next button
  if (mouseX > buttonX && mouseX < buttonX + buttonWidth && mouseY > buttonY && mouseY < buttonY + buttonHeight)
  {
    if (MouseDown) // pressed
    {
      CurrentState = PosterStates.SourceFilterTransition;
    }
    else // hover
    {
      fill(HoverColor);
    }
  }
  rect(buttonX, buttonY, buttonWidth, buttonHeight);
  //Next Button Text
  textAlign(CENTER, CENTER);
  textSize(SubHeaderFontSize);
  fill(TextColor);
  noStroke();
  text("Next", buttonX, buttonY, buttonWidth, buttonHeight);

  pop();
}

function DrawTransitionSourceFilter()
{
  background(BackgroundColor);
  push();

  if (AIoCSourceSelected)
  {
    Sources[Sources.length] = AIoCSource;
  }

  //Init and show DOM elemnts;
  for (var i = 0; i < ColorSchemeFilter.MaxColorCount; i++)
  {
    if (ColorSchemeFilter.ColorScheme[i] == undefined)
    {
      ColorSchemeFilter.ColorScheme[i] = { R : random(0, 255), G : random(0, 255), B : random(0, 255) };
    }
    ColorPickers[i].elt.value = ConvertFromSchemeColor(ColorSchemeFilter.ColorScheme[i]); 
  }
  SearchTermBox.show();
  UrlTextBox.show();
  UrlButton.show();

  pop();

  CurrentState = PosterStates.FilterSelection;
}

function DrawFilterSelection()
{
  background(BackgroundColor);
  push();

  // Draw Header Text
  var headerx = 0;
  var headery = height / 20;
  var headerWidht = width;
  var headerHeight = height / 5;
  textAlign(CENTER, TOP);
  textSize(HeaderFontSize);
  textFont(CustomFont);
  fill(TextColor);
  noStroke();
  text("Select / Configure Filters", headerx, headery, headerWidht, headerHeight);

  // Draw color scheme selection area
  var schemeBoxX = width / 100;
  var schemeBoxY = height / 4;
  var schemeBoxWidth = width / 2.2;
  var SchemeBoxHeight = height / 2.3;
  if (ColorSchemeFilterSelected)
  {
    fill(BoxColor);
  }
  else
  {
    fill(InactiveColor);
  }
  rect(schemeBoxX, schemeBoxY, schemeBoxWidth, SchemeBoxHeight);

  // Checkbox for color scheme filter
  var schemeCheckX = schemeBoxX + schemeBoxWidth / 2;
  var schemeCheckY = schemeBoxY - height / 18;
  var schemeCheckRadius = width / 9;
  if (ColorSchemeFilterSelected)
  {
    fill(ButtonColor);
    noStroke();
    circle(schemeCheckX, schemeCheckY, schemeCheckRadius);
    // Check mark
    noFill();
    stroke(255);
    var markLineWidth = schemeCheckRadius / 10;
    strokeWeight(markLineWidth);
    strokeCap(ROUND);
    line(schemeCheckX - (schemeCheckRadius / 2) + (2 * markLineWidth), schemeCheckY,  schemeCheckX - (schemeCheckRadius / 2) + (4 * markLineWidth), schemeCheckY + (2 * markLineWidth));
    line(schemeCheckX - (schemeCheckRadius / 2) + (4 * markLineWidth), schemeCheckY + (2 * markLineWidth), schemeCheckX - (schemeCheckRadius / 2) + (8 * markLineWidth), schemeCheckY - (2 * markLineWidth));
  }
  else
  {
    fill(InactiveColor);
    noStroke();
    circle(schemeCheckX, schemeCheckY, schemeCheckRadius);
  }
  // Hit test check box colorscheme
  if (mouseX > schemeCheckX - (schemeCheckRadius / 2) && mouseX < schemeCheckX + (schemeCheckRadius / 2) && mouseY > schemeCheckY - (schemeCheckRadius / 2) && mouseY < schemeCheckY + (schemeCheckRadius / 2))
  {
    if (MouseDown)
    {
      ColorSchemeFilterSelected = !ColorSchemeFilterSelected;
    }
    else // Hover
    {
      var broderWidth = width / 100;
      var borderX = schemeCheckX;
      var borderY = schemeCheckY;
      var broderRadius = schemeCheckRadius + (2 * broderWidth);
      strokeWeight(broderWidth);
      stroke(HoverColor);
      noFill();
      circle(borderX, borderY, broderRadius);
    }
  }

  //Slider bar
  var sliderWidth = schemeBoxWidth / 1.2;
  var sliderX = schemeBoxX + (schemeBoxWidth - sliderWidth - ((schemeBoxWidth - sliderWidth) / 2));
  var sliderX2 = sliderX + sliderWidth;
  var sliderY = schemeBoxY + SchemeBoxHeight * 0.05;
  strokeCap(ROUND);
  strokeWeight(height / 200);
  noFill()
  stroke(ControlColor);
  line(sliderX, sliderY, sliderX2, sliderY);
  // Slider Pos;
  var sliderPointX = sliderX + ((sliderWidth / (ColorSchemeFilter.MaxColorCount - ColorSchemeFilter.MinColorCount))) * (ColorSchemeFilter.ColorCount - ColorSchemeFilter.MinColorCount);
  var sliderPointY = sliderY;
  var sliderPointWidth = height / 50;
  fill(ButtonColor);
  noStroke();
  //Slider HitTest
  if (MovingColorsSlider)
  {
    if (mouseIsPressed)
    {
      ColorSchemeFilter.ColorCount = Math.round(Math.min(ColorSchemeFilter.MaxColorCount, Math.max(ColorSchemeFilter.MinColorCount, ((ColorSchemeFilter.MaxColorCount - ColorSchemeFilter.MinColorCount) / (sliderWidth / (mouseX - sliderX))) + 1)));
    }
    else
    {
      MovingColorsSlider = false;
    }
  }
  else if (mouseX > sliderPointX - (sliderPointWidth / 2) && mouseX <  sliderPointX + (sliderPointWidth / 2) && mouseY > sliderPointY - (sliderPointWidth / 2) && mouseY < sliderPointY + (sliderPointWidth / 2))
  {
    if (MouseDown)
    {
      MovingColorsSlider = true;
    }
    else
    {
      fill(HoverColor);
    }
  }
  ellipse(sliderPointX, sliderPointY, sliderPointWidth, sliderPointWidth);

  // Draw Color Cirle
  var colorCircleRadius = schemeBoxWidth / 1.2;
  var colorCircleX = schemeBoxWidth / 2
  var colorCricleY = schemeBoxY + SchemeBoxHeight / 2.4;
  var partSize = (TWO_PI / ColorSchemeFilter.ColorCount);
  for (var arcPart = 0; arcPart < ColorSchemeFilter.ColorCount; arcPart++)
  {
    noStroke();
    fill(color(ColorSchemeFilter.ColorScheme[arcPart].R, ColorSchemeFilter.ColorScheme[arcPart].G, ColorSchemeFilter.ColorScheme[arcPart].B, 255));
    arc(colorCircleX, colorCricleY, colorCircleRadius, colorCircleRadius, partSize * arcPart, partSize * (arcPart + 1));
  }

  // Draw color pickers
  var pickerX = sliderX;
  var pickerY = colorCricleY + (colorCircleRadius / 2);
  var pickerWidth = sliderWidth / ColorSchemeFilter.ColorCount;
  var pickerHeight = height / 20;
  for (var p = 0; p < ColorSchemeFilter.MaxColorCount; p++)
  {
    if (p < ColorSchemeFilter.ColorCount)
    {
      ColorPickers[p].show();
    }
    else
    {
      ColorPickers[p].hide();
    }
  }
  for (var picker = 0; picker < ColorSchemeFilter.ColorCount; picker++)
  {
    ColorPickers[picker].position(pickerX + (picker * pickerWidth), pickerY);
    ColorPickers[picker].size(pickerWidth, pickerHeight);
    ColorSchemeFilter.ColorScheme[picker] = ConvertToSchemeColor(ColorPickers[picker].color());
  }
  //Draw Url textbox
  var urlTextX = sliderX;
  var urlY = pickerY + pickerHeight + (height / 50);
  var urlHeight = height / 50;
  var urlTextWidth = sliderWidth * 0.75;
  var urlButtonWidth = sliderWidth - urlTextWidth;
  var urlButtonX = urlTextX + urlTextWidth;
  UrlTextBox.position(urlTextX, urlY);
  UrlTextBox.size(urlTextWidth, urlHeight);
  UrlButton.position(urlButtonX, urlY);
  UrlButton.size(urlButtonWidth - 6, urlHeight + 6);
  
  //Draw Search Term Box
  var searchBoxX = width / 1.9;
  var searchBoxY = height / 4;
  var searchBoxWidth = width / 2.2;
  var searchBoxHeight = height / 2.3;
  if (SearchTermSelected)
  {
    fill(BoxColor);
  }
  else
  {
    fill(InactiveColor);
  }
  rect(searchBoxX, searchBoxY, searchBoxWidth, searchBoxHeight);

  // Checkbox for color search filter
  var searchCheckX = searchBoxX + searchBoxWidth / 2;
  var searchCheckY = searchBoxY - height / 18;
  var searchCheckRadius = width / 9;
  if (SearchTermSelected)
  {
    fill(ButtonColor);
    noStroke();
    circle(searchCheckX, searchCheckY, searchCheckRadius);
    // Check mark
    noFill();
    stroke(255);
    var markLineWidth = searchCheckRadius / 10;
    strokeWeight(markLineWidth);
    strokeCap(ROUND);
    line(searchCheckX - (searchCheckRadius / 2) + (2 * markLineWidth), searchCheckY,  searchCheckX - (searchCheckRadius / 2) + (4 * markLineWidth), searchCheckY + (2 * markLineWidth));
    line(searchCheckX - (searchCheckRadius / 2) + (4 * markLineWidth), searchCheckY + (2 * markLineWidth), searchCheckX - (searchCheckRadius / 2) + (8 * markLineWidth), searchCheckY - (2 * markLineWidth));
  }
  else
  {
    fill(InactiveColor);
    noStroke();
    circle(searchCheckX, searchCheckY, searchCheckRadius);
  }
  // Hit test check box colorsearch
  if (mouseX > searchCheckX - (searchCheckRadius / 2) && mouseX < searchCheckX + (searchCheckRadius / 2) && mouseY > searchCheckY - (searchCheckRadius / 2) && mouseY < searchCheckY + (searchCheckRadius / 2))
  {
    if (MouseDown)
    {
      SearchTermSelected = !SearchTermSelected;
    }
    else // Hover
    {
      var broderWidth = width / 100;
      var borderX = searchCheckX;
      var borderY = searchCheckY;
      var broderRadius = searchCheckRadius + (2 * broderWidth);
      strokeWeight(broderWidth);
      stroke(HoverColor);
      noFill();
      circle(borderX, borderY, broderRadius);
    }
  }

  // Draw search header text
  var textHeaderX = searchBoxX;
  var textheaderY = searchBoxY + (height / 100);
  textFont(CustomFont);
  fill(TextColor);
  noStroke();
  textSize(SubHeaderFontSize);
  textAlign(CENTER, TOP);
  text("Search by term", textHeaderX, textheaderY, searchBoxWidth);

  //Draw text box vor seach Term
  var textSearchWidth = searchBoxWidth / 1.2
  var textSearchX = searchBoxX + (searchBoxWidth - textSearchWidth - ((searchBoxWidth - textSearchWidth) / 2));
  var textSearchY = searchBoxY + (height / 20);
  var textsearchHeight = height / 50;
  SearchTermBox.position(textSearchX, textSearchY);
  SearchTermBox.size(textSearchWidth, textsearchHeight);

  // Draw create poster Button
  var buttonWidth = width / 5;
  var buttonHeight = height / 10;
  var buttonX = width - buttonWidth - (width / 10);
  var buttonY = height - buttonHeight - (height / BottomTextHeight) - (height / 20);
  noStroke();
  fill(ButtonColor);
  // Hit test for create button
  if (mouseX > buttonX && mouseX < buttonX + buttonWidth && mouseY > buttonY && mouseY < buttonY + buttonHeight)
  {
    if (MouseDown) // pressed
    {
      CurrentState = PosterStates.FilterPosterTransition;
    }
    else // hover
    {
      fill(HoverColor);
    }
  }
  rect(buttonX, buttonY, buttonWidth, buttonHeight);
  //Create Button Text
  textAlign(CENTER, CENTER);
  textSize(SubHeaderFontSize);
  fill(TextColor);
  noStroke();
  text("Create", buttonX, buttonY, buttonWidth, buttonHeight);

  pop();
}

function DrawTransitionFilterPoster()
{
  background(BackgroundColor);
  push();

  //Set selected filter options
  if (ColorSchemeFilterSelected)
  {
    Filters[Filters.length] = ColorSchemeFilter;
  }
  if (SearchTermSelected)
  {
    for (var i = 0; i < Sources.length; i++)
    {
      Sources[i].SearchTerm = SearchTermBox.value();
      Sources[i].WithSearchTerm = true;
    }
  }
  else
  {
    for (var i = 0; i < Sources.length; i++)
    {
      Sources[i].WithSearchTerm = false;
    }
  }

  // Hide DOM elements
  for (var p = 0; p < ColorSchemeFilter.MaxColorCount; p++)
  {
    ColorPickers[p].hide();
  }
  SearchTermBox.hide();
  UrlTextBox.hide();
  UrlButton.hide();

  //Start all sources
  for (var i = 0; i < Sources.length; i++)
  {
    Sources[i].Start();
  }

  pop();

  CurrentState = PosterStates.PosterView;
}

function DrawPosterView()
{
  push();

  // Draw color sheme as background or normal background if color scheme filter was not selected
  var colorCricleY = (height - height / BottomTextHeight) / 2;
  if (ColorSchemeFilterSelected)
  {
    var colorCircleRadius = height * 2;
    var colorCircleX = width / 2;
    var partSize = (TWO_PI / ColorSchemeFilter.ColorCount);
    for (var arcPart = 0; arcPart < ColorSchemeFilter.ColorCount; arcPart++)
    {
      noStroke();
      fill(color(ColorSchemeFilter.ColorScheme[arcPart].R, ColorSchemeFilter.ColorScheme[arcPart].G, ColorSchemeFilter.ColorScheme[arcPart].B, 255));
      arc(colorCircleX, colorCricleY, colorCircleRadius, colorCircleRadius, partSize * arcPart, partSize * (arcPart + 1));
    }
  }
  else
  {
    background(BackgroundColor);
  }

  // Calculate gab in the middle
  var midWidth = width / 5;
  var gapThreshhold = (width / 2) - (midWidth / 2);
  var gapRows = [];
  if (SearchTermSelected || ColorSchemeFilterSelected)
  {
    if (PictureRows % 2 == 0)
    {
      gapRows[0] = Math.floor(PictureRows / 2);
      gapRows[1] = Math.floor(PictureRows / 2) - 1
    }
    else
    {
      gapRows[0] = Math.floor(PictureRows / 2);
    }
  }
  
  var pictureHeight = (height - height / BottomTextHeight) / PictureRows;

  // Draw search term in middle
  if (SearchTermSelected)
  {
    var searchTextx = gapThreshhold;
    var searchTexty = colorCricleY - (pictureHeight / 2);
    var searchtextWidth = midWidth;
    var searchtextHeight = pictureHeight;
    textAlign(CENTER, CENTER);
    textFont(CustomFont);
    textSize(HeaderFontSize);
    fill(TextColor);
    stroke(255);
    strokeWeight(HeaderFontSize / 20);
    text(Sources[0].SearchTerm, searchTextx, searchTexty, searchtextWidth, searchtextHeight);
  }

  // Draw Pictures
  var xPos = 0;
  var yPos = 0;
  var row = 0;
  for (var i = 0; i < Pictures.length; i++)
  {
    var pictureWidth = pictureHeight * (Pictures[i].SourcePicture.width / Pictures[i].SourcePicture.height);
    for (var g = 0; g < gapRows.length; g++)
    {
      if (gapRows[g] == row)
      {
        if (xPos + pictureWidth > gapThreshhold)
        {
          xPos = gapThreshhold + midWidth + (gapThreshhold - xPos);
          gapRows[g] = -1;
        }
      }
    }
    CanvasContext.drawImage(Pictures[i].SourcePicture, xPos, yPos, pictureWidth, pictureHeight);
    xPos += pictureWidth;
    if (xPos > width) // next picture would be outside of poster. The current picture gets the rest of it draw on the next row.
    {
      row++;
      yPos += pictureHeight;
      xPos -= width;
      xPos -= pictureWidth;
      CanvasContext.drawImage(Pictures[i].SourcePicture, xPos, yPos, pictureWidth, pictureHeight);
      xPos += pictureWidth
    }
  }

  // Stop sources if next picture would exceed the height of the poster.
  if (!Finished && yPos >= height - height / BottomTextHeight)
  {
    for (var s = 0; s < Sources.length; s++)
    {
      Sources[s].Stop();
    }
    Finished = true;
  }
  pop();
}

function DrawBottomText()
{
  push();

  // Base Rect
  var boxHeight = height / BottomTextHeight;
  var boxWidth = width;
  var boxX = 0;
  var boxY = height - boxHeight;
  noStroke();
  fill(BottomColor);
  rect(boxX, boxY, boxWidth, boxHeight);


  // Subject text
  var subjectX = width / 100;
  var subjectY = boxY;
  var subjectWidth = width - subjectX * 2;
  var subjectHeight = boxHeight / 2;
  textAlign(LEFT, CENTER);
  textFont(CustomFont);
  textSize(HeaderFontSize);
  fill(BottomTextColor);
  noStroke();
  text("Experimentelles Gestalten W22/23", subjectX, subjectY, subjectWidth, subjectHeight);

  // Name / Thema text
  var infoTextX = width / 100;
  var infoTextY = boxY + subjectHeight;
  var infoTextWidth = width - infoTextX * 2;
  var infoTextHeight = boxHeight / 2;
  textAlign(LEFT, CENTER);
  textFont(CustomFont);
  textSize(SubHeaderFontSize);
  fill(BottomTextColor);
  noStroke();
  text("Lukas Fortmeier // Image search poster", infoTextX, infoTextY, infoTextWidth, infoTextHeight);

  // QR code to github repo
  var qrX = width - boxHeight;
  var qrY = height - boxHeight;
  var qrWidth = boxHeight;
  var qrHeight = boxHeight;
  image(QrCode, qrX, qrY, qrWidth, qrHeight);
  // Qr info text
  push();
  var qrInfoX = qrX - (1.2 * NormalFontSize);
  var qrInfoY = height;
  var qrInfoWidth = boxHeight;
  var qrInfoHeight = qrX - qrInfoX;
  textAlign(CENTER, CENTER);
  textFont(CustomFont);
  textSize(NormalFontSize);
  fill(BottomTextColor);
  noStroke();
  translate(qrInfoX, qrInfoY);
  rotate(radians(270));
  text("Get the code", 0, 0, qrInfoWidth, qrInfoHeight);
  pop();
  // Hit test QR Code
  if (mouseX > qrX && mouseX < qrX + qrWidth && mouseY > qrY && mouseY < qrY + qrHeight)
  {
    if (MouseDown)
    {
      window.open("https://github.com/Baumkuchenmann/ImageSearchPoster");
    }
    else
    {
      var hoverOverlay = color(red(HoverColor), green(HoverColor), blue(HoverColor), 50);
      fill(hoverOverlay);
      noStroke();
      rect(qrX, qrY, qrWidth, qrHeight);
    }
  }

  pop();
}

//#endregion

//#region Export
function keyPressed()
{
  if (CurrentState == PosterStates.PosterView)
  {
    if (key == 's' || key == 'S')
    {
      pixelDensity(ExportScale);
      draw();
      let fileName = "ImageSearch " + year() + "_" + month() +"_" + day() + "_" + hour() + "_" + minute() + "_" + second() + ".png";
      saveCanvas(fileName);
      pixelDensity(1);
    }
  }
}
//#endregion