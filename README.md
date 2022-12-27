# Image Search Poster
 University project for module "Experimentelles Gestalten" winter 22/23.

 Made with Visual Studio Code and p5.vscode extension (https://marketplace.visualstudio.com/items?itemName=samplavigne.p5-vscode).


# Function
 This app takes pictures from APIs, filters them by the selected condition and arranges them into a poster. 

## Picture Sources
 Currently only the Art Intitue of Chicago (https://api.artic.edu/docs/#quick-start) is supported. 

## Filter
 Two filter options are available. Fitler by color scheme and filter by search term. The search term currently uses the API build in search.<br />
 Searching for a color scheme works by selecting how many colors the color scheme has. Then each color can be configured with color pickers or by giving an URL to an image to load a color scheme from. Not all image url work due to security restrictions by the source. When creating the poster the color schem for the loaded pictures will be evaluated and compared with the previously configured color scheme. Color scheme evaluation work with an implementation of the k-means algorithm.

## Poster
 The poster arranges the picutes in a fixed number of rows starting at the upper left corner. The number of rows can currently only be configured in the code. If a row is filled the picture at right will be not be displayed fully and the rest will be drawn in the next row. A gap in the middle will be left to show the filter conditions (1 row gap for uneven number of rows, 2 row gap for even number of rows). If search term is selected the term is written in the middle and if color scheme is selected the scheme will be drawn as background.

# ToDo
 Clicking on a picture could show source, link, title, description, color scheme and the chart like the in the test project KMeansChart.<br />
 The api stops sending picutures after ~2000 pictures, propably due to security restriction or missing log in. <br />
 Search term is not secure, the user might type in url invalid terms.<br />
 Color scheme search might take a long time since the scheme for all loaded pictures must be evaluated. A async mechanism or a database with already calculated color schemes might increase performance. Currently using the color schme of a Art Institue of Chicago picture is the best way to use the color scheme filter.<br />
 Saving only works by right click save, a save button which will not be exported could be implemented.<br />
 Text boxes, buttons and color pickers need styles and scale up.