/* By Bo Ericsson, bo@boe.net, beric00@gmail.com */

/*
   Please note that the terms "validation" and "invalidation" refers to the determination
   of which images should remain in the DOM or be evacuated, to ensure that no more than
   a certain number of images ("maxImages") are present in the DOM at any given point in
   time. This determination is done dynamically as the user is scrolling up or down. That
   logic sets a "valid" prop on the object that holds the image information. Then in render,
   when each image is rendered, that "valid" prop controls whether the "src" attribute of
   the <img> element is set or cleared.

   Also please note that this implementation presents to the user a permanent and stable
   set of images. The response of the cat api delivers random cat images. In this
   implementation, when the api returns the cat url references, those reference are kept
   permanently in the image array. So when a page worth of images have been unloaded from
   the DOM, and then restored, the very same "url" prop is set on the corresponding <img>
   element. Another way to say it that a "green ugly cat" at image position 31, will always
   be such "green ugly cat" image ;-)
*/

// Imports
import React from "react";

// Constants
const TOP = "top";
const BOTTOM = "bottom";
const MIDDLE = "middle";

const DEBUG = true;

// Height of the image container elements
// Heights to try: 30, 50, 100, 200, etc.
const imageContainerHeight = 200;

// Number of images per each api request. Must be sufficiently large so that when after
// the initial (and automatic) load of "pageSize" images, the images fill all avaiable
// space in the containing window. Otherwise the will not be able to scroll down, and
// a scroll down no additional images will be loaded
// Sizes to try: 10, 20, 30, etc.
const pageSize = 10;

// Maximum number of images allowed in the DOM. Must be at least three times
// the pageSize to leave sufficient number of images on both sides of the current
// page. It also needs to be a multiple of the page size
// Values to try: 30 (with pageSize 10), 60 (with pageSize 20), 90 (with pageSize 30)
const maxImages = 30;

// Input validation
if (maxImages < pageSize * 2) {
  throw new Error("maxImages must be twice the pageSize");
}
if (maxImages % pageSize !== 0) {
  throw new Error("maxImages must be a multiple of the pageSize");
}
if (maxImages < 3 * pageSize) {
  throw new Error("maxImages must be at least three times the pageSize");
}

// Variable used to "center" the DOM-loaded images around the current page
const halfMaxPages = ~~(maxImages / pageSize / 2) * pageSize;

const imageOuterContainerStyle = {
  height: `${imageContainerHeight}px`,
  maxHeight: `${imageContainerHeight}px`,
  outline: "1px solid black",
  overflow: "hidden"
};

const imageInnerContainerStyle = {
  color: "white",
  padding: "10px",
  fontFamily: "Helvetica",
  display: "flex",
  flexDirection: "column"
};

const overlayHeight = 400;
const overlayStyle = {
  position: "fixed",
  top: "40px",
  left: "200px",
  width: "100px",
  backgroundColor: "rgba(255, 255, 255, 0.01)",
  display: "flex",
  flexDirection: "column"
};

const currentDomSelectionStyle = {
  position: "absolute",
  left: "0px",
  width: "100px",
  backgroundColor: "rgba(100, 100, 100, 0.1)"
};

const currentPageStyle = {
  position: "absolute",
  left: "0px",
  width: "100px",
  borderTop: "1px solid black",
  marginLeft: "0px",
  fontFamily: "Helvetica",
  fontSize: "10px",
  textIndent: "5px",
  backgroundColor: "yellow"
};

let renderCount = 0;

class App extends React.PureComponent {
  constructor() {
    super();

    // Set the initial state
    this.state = {
      page: 0,
      images: [],
    };

    this.offset = 0;
    this.position = TOP;

    // Create a ref to the container of the container of the cat elements
    this.container = React.createRef();

    // Bind this to event handlers
    this.trackScroll = this.trackScroll.bind(this);
  }

  componentDidMount() {
    const { page } = this.state;

    // Add scroll event listener
    window.addEventListener("scroll", this.trackScroll, true);

    // Get the offset into the client rectangle
    this.offset = this.container.current.getBoundingClientRect().top;

    // Do the initial fetch of images
    this.fetchPage(page);
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.trackScroll);
  }

  trackScroll() {
    const { page } = this.state;
    const offset = this.offset;

    // Use the container ref to get the container elem
    const container = this.container.current;

    // Get the container's bottom position in pixels (changes with scrolling)
    const containerBottomPos =
      container.getBoundingClientRect().bottom - offset;

    // Get the container's top position in pixels (changes with scrolling)
    const containerTopPos = container.getBoundingClientRect().top - offset;

    // Get the window height in pixels
    const innerHeight = window.innerHeight;

    // Compute position
    const newPosition =
      innerHeight > containerBottomPos
        ? BOTTOM
        : -containerTopPos < imageContainerHeight
          ? TOP
          : MIDDLE;

    // Compute the current page
    const currentPage = ~~(-containerTopPos / (pageSize * imageContainerHeight));

    // Determine if a scroll to the bottom has occurred
    if (this.position !== newPosition && newPosition === BOTTOM) {
      console.log("trackScroll: bottom has been reached - append new page");

      // One shot trigger to fetch more images
      this.fetchPage(currentPage + 1);
      return;
    }

    // If we're at the same page as before, so do no further processing
    if (page === currentPage) {
      return;
    }

    // Update position
    this.position = newPosition;

    // Whenever the page is changing as the user is scrolling up/down, update the page logic
    this.fetchPage(currentPage);
  }

  fetchPage(page) {
    const { images } = this.state;

    // Determine if this is an append operation
    if (page * pageSize >= images.length) {
      // Handle append operation

      // Immediately append a set of placeholder image items
      const startIdx = images.length;
      const endIdx = startIdx + pageSize;
      const newImages = [ ...images ];
      for (let idx = startIdx; idx < endIdx; idx++) {
        newImages.push({
          backgroundColor: "darkgray", // While waiting for the new images to arrive, use darkgray
          id: idx,
          url: "",
          valid: true
        });
      }

      // Determine the current number of valid images
      const validImageCount = newImages.filter(d => d.valid).length || 0;

      // Determine if images should be invalidated
      if (validImageCount > maxImages) {
        // Determine number of items to invalidate
        const itemsToInvalidate = newImages.length - maxImages;

        // Define indicies for invalidation iteration
        const endIdx = newImages.length - maxImages;
        const startIdx = endIdx - itemsToInvalidate;

        // Invalidate the beginning of the array (as we're appending at the end)
        for (let idx = startIdx; idx < endIdx; idx++) {
          images[idx].valid = false;
        }
      }

      // Update state with a new instance of images (which includes the placeholders
      // for the just requested new images). This will cause a refresh, needed for the
      // the scroll logic
      this.setState(
        { images: newImages },
        // Immediately after completion of setState, fire the api call
        () => {
          const { images } = this.state;

          // Fetch a pageSize of cat images
          fetch(
            `https://api.thecatapi.com/v1/images/search?limit=${pageSize}&page=${page}`,
            {
              headers: {
                "Content-Type": "application/json",
                "x-api-key": "b3f8e6b0-6482-499f-9847-f099630ca460" // BoE's personal api key
              }
            }
          )
            .then(data => data.json())
            .then(data => {
              const imagesFromApi = data.map((d, idFromData) => {
                const backgroundColor = "gray"; // Replace the placeholder dark gray with gray

                const { id: idFromApi, url } = d;
                return {
                  backgroundColor,
                  id: pageSize * page + idFromData,
                  idFromApi,
                  url,
                  valid: true
                };
              });

              // Add the just-arrived image references in the right place in the images array.
              // This will normally be at the end of the images array, but in an edge case where
              // the user has a slow internet connection and has already scrolled a pageSize
              // down and caused another load of pageSize images, it wouldn't be at the end...
              const startIdx = page * pageSize;
              const endIdx = startIdx + pageSize;
              const frontImages = images.slice(0, startIdx);
              const backImages = images.slice(endIdx, images.length);
              const newImages = [
                ...frontImages,
                ...imagesFromApi,
                ...backImages
              ];

              // Update state with a new instance of the images, which now contains the
              // url references to each image
              this.setState({ images: newImages });
            });
        }
      );
    } else {
      // Handle non-append situation
      const updatedImages = [ ...images ];

      // Invalidae all images
      updatedImages.forEach(d => (d.valid = false));

      // Then compute array indicies for validation of those images centered around the current
      // page, taking into account various boundary conditions (beginning and end of the array
      // and less images loaded than max allowd in the DOM)
      let startIdx = page * pageSize - halfMaxPages;
      startIdx =
        startIdx < 0
          ? 0
          : startIdx + maxImages > images.length
            ? Math.max(0, images.length - maxImages)
            : Math.max(0, startIdx);
      const endIdx = Math.min(startIdx + maxImages, images.length);

      // Validate the images between the indicies
      for (let idx = startIdx; idx < endIdx; idx++) {
        updatedImages[idx].valid = true;
      }

      // Then update state
      this.setState({
        images: updatedImages,
        page
      });
    }
  }

  render() {
    const { images, page } = this.state;

    // Compute variables for debug and overlay
    const firstValidIdx = images.findIndex(d => d.valid);
    const lastValidIdx = images.length - images.slice().reverse().findIndex(d => d.valid) - 1;
    const spanLength = lastValidIdx - firstValidIdx + 1;

    // Turn off the DEBUG boolean if you don't wan't to see noise in the console...
    if (DEBUG && images.length !== 0) {
      console.log(`${renderCount++} Images in DOM: ${spanLength}, total: ${images.length} (idx ${firstValidIdx}-${lastValidIdx}), Page: ${page})`);
      // console.log('images', images);
    }

    // Compute values for overlay
    const overlayHeightStyle = `${overlayHeight}px`;
    const percentValid = (lastValidIdx - firstValidIdx + 1) / (images.length || 1);
    const selectionHeight = overlayHeight * percentValid;
    const selectionHeightStyle = `${selectionHeight}px`;
    const currentPageTopStyle = `${((page * pageSize) / (images.length || 1)) * overlayHeight}px`;
    const currentPageHeightStyle = `${(pageSize / (images.length || 1)) * overlayHeight}px`;
    const currentPageString = `Current page: ${page}`;
    const selectionTop = (firstValidIdx / (images.length || 1)) * overlayHeight;
    const selectionTopStyle = `${selectionTop}px`;

    return (
      <div ref={this.container}>
        {images.map(d => {
          const { backgroundColor, id, url: originalUrl, valid } = d;

          // Determine if this image should be evacuated from the DOM
          // Please note that the "valid" prop is determined by the validation procedures in the
          // fetchPage method above
          const url = valid ? originalUrl : "";

          return (
            <div
              key={id}
              style={{ ...imageOuterContainerStyle, ...{ backgroundColor } }}
            >
              <div style={imageInnerContainerStyle}>
                <div>
                  {`Id: ${id}, valid: ${valid}, color: ${backgroundColor}, url: ${url}`}
                </div>
                <div style={{ marginTop: "10px" }}>
                  <img
                    alt="This is some kind of cat..."
                    src={url}
                    style={{
                      width: `${imageContainerHeight * 0.75}px`,
                      height: `${imageContainerHeight * 0.75}px`
                    }}
                  />
                </div>
              </div>
              <div style={{ ...overlayStyle, ...{ height: overlayHeightStyle } }}>
                <div
                  style={{
                    ...currentDomSelectionStyle,
                    ...{ top: selectionTopStyle, height: selectionHeightStyle }
                  }}
                />
                <div
                  style={{
                    ...currentPageStyle,
                    ...{ top: currentPageTopStyle, height: currentPageHeightStyle }
                  }}
                >
                  {currentPageString}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}

export default App;
