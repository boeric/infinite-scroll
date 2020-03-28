import React from "react";

// Constants
const TOP = "top";
const BOTTOM = "bottom";
const MIDDLE = "middle";

const DEBUG = true;

const imageHeight = 100;
const totalImageHeight = 100;
const pageSize = 10;
const maxImages = 30;
let nextId = 0;

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

    // Create a ref to the container
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

    // Do the initial fetch
    this.fetchPage(page);
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.trackScroll);
  }

  trackScroll() {
    const { position, offset, page } = this.state;

    // Use ref to get the container
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
        : -containerTopPos < imageHeight
        ? TOP
        : MIDDLE;

    // Compute the current page
    const currentPage = ~~(-containerTopPos / (pageSize * totalImageHeight));

    // Determine if a scroll to the bottom has occurred
    if (position !== newPosition && newPosition === BOTTOM) {
      console.log("trackScroll: bottom has been reached - append new page");
      // One shot trigger to fetch more images
      this.fetchPage(currentPage + 1);
    }

    // if we're at the same page as before, do no further processing
    if (page === currentPage) {
      return;
    }

    // Whenever the page is changing as the user is scrolling up/down, update the page logic
    console.log("trackScroll: - page change:", currentPage);
    this.fetchPage(currentPage);
    this.setState({
      position: newPosition
      // page: currentPage,
    });
  }

  generateNew() {
    const images = [];
    for (let i = 0; i < pageSize; i++) {
      const red = ~~(Math.random() * 256);
      const green = ~~(Math.random() * 256);
      const blue = ~~(Math.random() * 256);
      const backgroundColor = `rgb(${red}, ${green}, ${blue})`;

      images.push({
        id: nextId++,
        backgroundColor,
        valid: true
      });
    }

    return images;
  }

  fetchPage(page) {
    console.log("fetchPage: ", page);
    const { images } = this.state;

    // Determine if this is an append operation
    if (page * pageSize >= images.length) {
      // Handle append operation
      console.log("append");

      // We're here fetching a new page to be added to the end of the images array
      const newImages = [...images, ...this.generateNew()];

      // Determine the current number of valid images
      const validImageCount = newImages.filter(d => d.valid).length || 0;

      // Determine if images should be invalidated
      if (validImageCount > maxImages) {
        // Determine number of items to invalidate
        const itemsToInvalidate = newImages.length - maxImages;

        // Define indicies for invaliation iteration
        const endIdx = newImages.length - maxImages;
        const startIdx = endIdx - itemsToInvalidate;

        // Invalidate the beginning of the array (as we're appending to the end)
        for (let idx = startIdx; idx < endIdx; idx++) {
          images[idx].valid = false;
        }
      }

      // Add the new images
      this.setState({
        images: [...newImages],
        page
      });
    } else {
      // Handle non-append situation
      console.log("nonAppend");

      // Invalidae all images
      images.forEach(d => (d.valid = false));

      // Then validate from two pages prior current page and through the current page
      const startIdx = Math.max(0, page - 2) * pageSize;
      const endIdx = Math.min(startIdx + maxImages, images.length);
      const updatedImages = images.slice();

      // Validate the images between the indicies
      for (let idx = startIdx; idx < endIdx; idx++) {
        updatedImages[idx].valid = true;
      }

      this.setState({
        images: [...updatedImages],
        page
      });
    }
  }

  render() {
    const { images, page } = this.state;

    if (DEBUG && images.length !== 0) {
      // Compute variables for debug/console.log
      const firstValidIdx = images.findIndex(d => d.valid);
      const lastValidIdx =
        images.length -
        images
          .slice()
          .reverse()
          .findIndex(d => d.valid) -
        1;
      const spanLength = lastValidIdx - firstValidIdx + 1;
      console.log(
        `first valid span: ${firstValidIdx}, last valid idx: ${lastValidIdx}, valid span: ${spanLength}, current page: ${page}`
      );
    }

    return (
      <div ref={this.container}>
        {images.map(d => {
          const { backgroundColor, id, valid } = d;

          return (
            <div
              key={id}
              style={{
                height: "100px",
                backgroundColor
              }}
            >
              <div
                style={{
                  color: "white",
                  padding: "10px",
                  fontFamily: "Helvetica"
                }}
              >
                {`Id: ${id}, valid: ${valid}, color: ${backgroundColor}`}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}

export default App;
