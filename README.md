Demo of inifite scroll of images from the **cat.api** where only a finite number of images are kept in the browser.

In the `App.js` file, please note that the terms "validation" and "invalidation" refers to the determination of which images should remain in the DOM or be evacuated, to ensure that no more than a certain number of images ("maxImages") are present in the DOM at any given point in time. This determination is done dynamically as the user is scrolling up or down. That logic sets a "valid" prop on the object that holds the image information. Then in "render", when each image is rendered, that "valid" prop controls whether an <img> element is generated or not.

Also please note that this implementation presents to the user a permanent and stable set of images. The response of the cat api delivers random cat images. In this implementation, when the api returns the cat url references, those reference are kept permanently in the image array. So when a page worth of images have been unloaded from the DOM, and then restored, the very same "url" prop is set on the corresponding <img> element. Another way to say it that a "green ugly cat" at image position 31, will always be such "green ugly cat" image ;-).

Finally, the overlay rectangle shows four things:
  a) The overall height represents all images fetched
  b) The yellow rectangle represents the images of the current page
  c) The gray rectangle represents those images currently in the DOM
  d) The white background represents those images that have been evacuated from the DOM

I suggest a down-scroll to, let's say, 80-100 images. When the app opens up, all is yellow, as the initial auto-fetch will obviously be all images and therefore fill up the full rectangle. Further down-scrolls will add more images and the current page (yellow) will become smaller. Eventually as further down-scrolls occurs, the app will have fetched more images than allowed in the DOM, the white background will appear. Further scrolls will move the gray and yellow rectangles down. Then start scrolling back up towards the top, and the gray/yellow rectangles will move accordingly. Basically, the full algorithm is visualized with these simple <div>s.