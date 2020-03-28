import React from "react";

// Constants
const TOP = "top";
const BOTTOM = "bottom";
const MIDDLE = "middle";

const DEBUG = true;

const imageHeight = 200;
const pageSize = 10;
const maxImages = 30;

// Input validation
if (maxImages < pageSize * 2) {
  throw new Error('maxImages must be twice the pageSize')
}
if (maxImages % pageSize !== 0) {
  throw new Error('maxImages must be a multiple of the pageSize')
}

// Variable used to "center" the DOM-loaded images around the current page
const halfMaxPages = (~~(maxImages / pageSize / 2) * pageSize);

const imageOuterContainerStyle = {
  height: `${imageHeight}px`,
  maxHeight: `${imageHeight}px`,
  outline: '1px solid black',
  overflow: 'hidden',
};

const imageInnerContainerStyle = {
  color: "white",
  padding: "10px",
  fontFamily: "Helvetica",
  display: "flex",
  flexDirection: "column",
}

const overlayHeight = 400;
const overlayStyle = {
  position: 'fixed',
  top: '40px',
  left: '200px',
  width: '100px',
  backgroundColor: 'rgba(255, 255, 255, 0.01)',
  display: 'flex',
  flexDirection: 'column',
};

const currentDomSelectionStyle = {
  position: 'absolute',
  left: '0px',
  width: '100px',
  backgroundColor: 'rgba(100, 100, 100, 0.1)',
};

const currentPageStyle = {
  position: 'absolute',
  left: '0px',
  width: '100px',
  borderTop: '1px solid black',
  marginLeft: '0px',
  fontFamily: 'Helvetica',
  fontSize: '10px',
  textIndent: '5px',
  backgroundColor: 'yellow',
};


class App extends React.Component {
  constructor() {
    super();

    // Set the initial state
    this.state = {
      page: 0,
      position: TOP,
      images: [],
      offset: 0
    };

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
    const offset = this.container.current.getBoundingClientRect().top;
    this.setState({ offset });

    // Do the initial fetch of images
    this.fetchPage(page);
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.trackScroll);
  }

  trackScroll() {
    const { position, offset, page } = this.state;

    // Use the container ref to get the container elem
    const container = this.container.current;

    // Get the container's bottom position in pixels (changes with scrolling)
    const containerBottomPos = container.getBoundingClientRect().bottom - offset;

    // Get the container's top position in pixels (changes with scrolling)
    const containerTopPos = container.getBoundingClientRect().top - offset;

    // Get the window height in pixels
    const innerHeight = window.innerHeight;

    // Compute position
    const newPosition =
      innerHeight > containerBottomPos
        ? BOTTOM
        : -containerTopPos < imageHeight
          ? TOP
          : MIDDLE;

    // Compute the current page
    const currentPage = ~~(-containerTopPos / (pageSize * imageHeight));

    // Determine if a scroll to the bottom has occurred
    if (position !== newPosition && newPosition === BOTTOM) {
      console.log("trackScroll: bottom has been reached - append new page");
      // One shot trigger to fetch more images
      this.fetchPage(currentPage + 1);
    }

    // If we're at the same page as before, so do no further processing
    if (page === currentPage) {
      return;
    }

    // Whenever the page is changing as the user is scrolling up/down, update the page logic
    //console.log("trackScroll: - page change:", currentPage);
    this.fetchPage(currentPage);
    this.setState({
      position: newPosition
    });
  }

  fetchPage(page) {
    // console.log("fetchPage: ", page);
    const { images } = this.state;

    // Determine if this is an append operation
    if (page * pageSize >= images.length) {
      // Handle append operation
      // console.log("append");

      // Immediately append a set of  placeholder image items
      const startIdx = images.length;
      const endIdx = startIdx + pageSize;
      const newImages = [...images];
      for (let idx = startIdx; idx < endIdx; idx++) {
        newImages.push({
          backgroundColor: 'gray',
          id: idx,
          url: '',
          valid: true,
        })
      }

      // Determine the current number of valid images
      const validImageCount = newImages.filter(d => d.valid).length || 0;

      // Determine if images should be invalidated
      if (validImageCount > maxImages) {
        // Determine number of items to invalidate
        const itemsToInvalidate = newImages.length - maxImages;

        // Define indicies for invaliation iteration
        const endIdx = newImages.length - maxImages;
        const startIdx = endIdx - itemsToInvalidate;

        // Invalidate the beginning of the array (as we're appending at the end)
        for (let idx = startIdx; idx < endIdx; idx++) {
          images[idx].valid = false;
        }
      }

      this.setState({images: newImages},
        () => {
          const { images } = this.state;

          // Fetch a page worth of images
          fetch(
            `https://api.thecatapi.com/v1/images/search?limit=${pageSize}&page=${page}`,
            {
              headers: {
                "Content-Type": "application/json",
                "x-api-key": "b3f8e6b0-6482-499f-9847-f099630ca460"
              }
            }
          )
            .then(data => data.json())
            .then(data => {
              // console.log(data);
              const imagesFromApi = data.map((d, idFromData) => {
                const backgroundColor = 'gray';

                const { id: idFromApi, url } = d;
                return {
                  backgroundColor,
                  id: pageSize * page + idFromData,
                  idFromApi,
                  url,
                  valid: true
                };
              });

              const startIdx = page * pageSize;
              const endIdx = startIdx + pageSize;
              const frontImages = images.slice(0, startIdx);
              const backImages = images.slice(endIdx, images.length);
              const newImages = [ ...frontImages, ...imagesFromApi, ...backImages ];

              this.setState({images: newImages})
            });
        });
    } else {
      // Handle non-append situation
      // console.log("nonAppend");
      const updatedImages = [ ...images ];

      // Invalidae all images
      updatedImages.forEach(d => (d.valid = false));

      // Then compute array indicies for validate of those images centered around
      // the current page, taking into account various boundary conditions (beginning
      // and end of the array and less images loaded than max allowd in the DOM)
      let startIdx = page * pageSize - halfMaxPages;
      startIdx = startIdx < 0
        ? 0
        : startIdx + maxImages > images.length
          ? Math.max(0, images.length - maxImages)
          : Math.max(0, startIdx);
      const endIdx = Math.min(startIdx + maxImages, images.length)

      // Validate the images between the indicies
      for (let idx = startIdx; idx < endIdx; idx++) {
        updatedImages[idx].valid = true;
      }

      this.setState({
        images: [ ...updatedImages ],
        page
      });
    }
  }

  render() {
    const { images, page } = this.state;

    // Compute variables for debug/console.log
    const firstValidIdx = images.findIndex(d => d.valid);
    const lastValidIdx =
      images.length - images.slice().reverse().findIndex(d => d.valid) - 1;
    const spanLength = lastValidIdx - firstValidIdx + 1;

    // Turn off the DEBUG boolean if you don't wan't to see noise in the console...
    if (DEBUG && images.length !== 0) {
      console.log(`Images in DOM: ${spanLength}, total: ${images.length} (idx ${firstValidIdx}-${lastValidIdx}), Page: ${page})`);
      // console.log('images', images);
    }

    // Compute values for overlay
    const overlayHeightStyle = `${overlayHeight}px`;
    const percentValid = (lastValidIdx - firstValidIdx + 1) / (images.length || 1);
    const selectionHeight = overlayHeight * percentValid;
    const selectionHeightStyle = `${selectionHeight}px`;
    const currentPageTopStyle = `${page * pageSize / (images.length || 1) * overlayHeight}px`;
    const currentPageHeightStyle = `${pageSize / (images.length || 1) * overlayHeight}px`;
    const currentPageString = `Current page: ${page}`;
    const selectionTop = firstValidIdx / (images.length || 1) * overlayHeight;
    const selectionTopStyle = `${selectionTop}px`;

    return (
      <div ref={this.container}>
        {images.map(d => {
          const { backgroundColor, id, url: originalUrl, valid } = d;

         // Determine if this image should be evacuated from the browser cache
         // Please note that the "valid" prop is determined by the cleansing
         // algoritms above
         // Hard to test, as the browser keeps its own cache of imates, but
         // plese inspect the DOM and to see that the source prop is an empty string
         // for those images evacuated
          const url = valid ? originalUrl : "";

          return (
            <div key={id} style={{ ...imageOuterContainerStyle, ...{ backgroundColor } }}>
              <div style={imageInnerContainerStyle}>
                <div>
                  {`Id: ${id}, valid: ${valid}, color: ${backgroundColor}, url: ${url}`}
                </div>
                <div style={{ marginTop: "10px" }}>
                  <img
                    alt="This is some kind of cat..."
                    src={url}
                    style={{ width: `${imageHeight * .75}px`, height: `${imageHeight * .75}px` }}
                  />
                </div>
              </div>
              <div style={{ ...overlayStyle, ...{ height: overlayHeightStyle } }}>
                <div style={{ ...currentDomSelectionStyle, ...{ top: selectionTopStyle, height: selectionHeightStyle } }}/>
                <div style={{...currentPageStyle, ...{ top: currentPageTopStyle, height: currentPageHeightStyle } }}>
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
