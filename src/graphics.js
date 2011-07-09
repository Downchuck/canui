// $Id$

// height in pixels of a line text
// todo: this is crap, depends on font, dpi, etc. but measureText()
// doesn't give the height
var g_line_height = 16;

// space between two consecutive lines of text (todo: also crap, but
// less crap)
var g_line_spacing = 3;

// calls f() when the given image object has finished loading. If the
// image is already loaded, f() is called directly.
//
function require_loaded(image, f)
{
  if (image == undefined)
    return;
  
  // already loaded
  if (image.complete)
  {
    f();
    return;
  }

  image.onload = function()
    {
      f();
    };
  
  image.onerror = function()
    {
      // todo
      assert(false);
    };
}


// rgba color, all between 0.0 and 1.0. Predefined colors can used
// like this: new color().black().
//
function color(r, g, b, a)
{
  this.internal_is_a_color = true;

  this.r = r;
  this.g = g;
  this.b = b;
  this.a = (a == undefined ? 1.0 : a);
  
  // returns a css color string
  //
  this.string = function()
  {
    return "rgba(" +
      to_int(this.r*255) + ", " +
      to_int(this.g*255) + ", " +
      to_int(this.b*255) + ", " +
      this.a + ")";
  };
  
  // returns a black color
  //
  this.black = function()
  {
    return new color(0, 0, 0, 1.0);
  };
  
  // returns a while color
  //
  this.white = function()
  {
    return new color(1.0, 1.0, 1.0, 1.0);
  };
  
  // returns a fully transparent color
  //
  this.transparent = function()
  {
    return new color(0.0, 0.0, 0.0, 0.0);
  };
  
  // returns a red color
  //
  this.red = function()
  {
    return new color(1.0, 0.0, 0.0, 1.0);
  };

  // returns a green color
  //
  this.green = function()
  {
    return new color(0.0, 1.0, 0.0, 1.0);
  };
  
  // returns a blue color
  //
  this.blue = function()
  {
    return new color(0.0, 0.0, 1.0, 1.0);
  };
}

// returns 1.0-x for each color with same alpha
//
function color_inverse(c)
{
  return new color(1.0-c.r, 1.0-c.g, 1.0-c.b, c.a);
}

// clips the given rectangle
//
function clip(context, r)
{
  context.beginPath();
  context.rect(to_int(r.x), to_int(r.y), to_int(r.w), to_int(r.h));
  context.clip();
}

// draws the given line. See make_rect_path()
// todo: this is somewhat broken, first and last pixels are anti-
// aliased
//
function draw_line(context, c, r)
{
  assert(valid_bounds(r));

  if (c.string)
    context.strokeStyle = c.string();
  else
    context.strokeStyle = c;

  var d = 0.5;

  context.beginPath();
  context.moveTo(to_int(r.x)+d, to_int(r.y)+d);
  context.lineTo(to_int(r.x+r.w-1)+d, to_int(r.y+r.h-1)+d);
  context.stroke();
}

// outlines the given rectangle using the given color
//
function outline_rect(context, c, r)
{
  assert(valid_bounds(r));

  if (c.string)
    context.strokeStyle = c.string();
  else
    context.strokeStyle = c;

  make_rect_path(context, r);
  context.stroke();
}

//todo: color should also be a gradient so that internal_is_a_color
// can be used

// fills the given rectangle using the given color color 
//
function fill_rect(context, c, r)
{
  assert(c != undefined);
  assert(r != undefined && r.internal_is_a_rectangle && valid_bounds(r));

  if (c.string)
  {
    assert(c.internal_is_a_color);
    context.fillStyle = c.string();
  }
  else
  {
    context.fillStyle = c;
  }

  // this is not using make_rect_path() because fillRect() is not
  // using the line width; offseting by 0.5 would antialias the
  // borders of the fill
  context.fillRect(
    to_int(r.x), to_int(r.y), to_int(r.w), to_int(r.h));
}

// outlines a dotted rectangle
//
function dotted_rect(context, c, r)
{
  assert(c != undefined && c.internal_is_a_color);
  assert(r != undefined && r.internal_is_a_rectangle && valid_bounds(r));

  // todo: there's no easy way to make a dotted line here. There's
  // nothing built-in (drawFocusRing/drawSystemFocusRing is unclear
  // to me and seems unsupported on firefox anyways).
  //
  // Setting individual pixels in a loop might work, but the only way
  // I see is to use getImageData() and putImageData(). The problem
  // is two-fold: 1) setting individual pixels in the data array seems
  // to be antialiased or something, I can't get odd pixels only to
  // light up; 2) but anyways get/putImageData() do not use the
  // current transformation and since 'r' is relative to the parent
  // container, dotted_rect() would either need absolute coordinates
  // or a reference to the control so that the coordinates may be
  // offset (both are ugly)
  //
  // therefore, a series of 1x1 rectangles are filled; this is
  // probably the most inefficient implementation of a dotted line,
  // but hey
  //
  context.fillStyle = c.string();
  
  var b=true;
  for (var x=r.x; x<r.x+r.w; ++x)
  {
    if (b)
      context.fillRect(to_int(x), to_int(r.y), 1, 1);
    b = !b;
  }

  for (var y=r.y+1; y<r.y+r.h; ++y)
  {
    if (b)
      context.fillRect(to_int(r.x+r.w-1), to_int(y), 1, 1);
    b = !b;
  }

  for (var x=r.x+r.w-2; x>=r.x; --x)
  {
    if (b)
      context.fillRect(to_int(x), to_int(r.y+r.h-1), 1, 1);
    b = !b;
  }

  for (var y=r.y+r.h-2; y>=r.y; --y)
  {
    if (b)
      context.fillRect(to_int(r.x), to_int(y), 1, 1);
    b = !b;
  }
}

// see https://developer.mozilla.org/en/Canvas_tutorial/Applying_styles_and_colors
// for some gory details. Basically, coordinate (1, 1) does *not*
// refer to pixel (1, 1), but to the grid coordinate (1, 1):
//
//   +---+---+---+--
//   |   |   |   |
//   +---X---+---+--
//   |   | Y |   |
//   +---+---+---+--
//   |
//
// In this diagram, (1, 1) is X, *not* Y. Therefore, a line (1, 0) to
// (1, 2) with a line width of 1 will do
//
//   +---+---+---+--
//   |  XXX  |   |
//   +--XXX--+---+--
//   |  XXX  |   |
//   +---+---+---+--
//   |
//
//  instead of
//
//   +---+---+---+--
//   |   |XXX|   |
//   +---+XXX+---+--
//   |   |XXX|   |
//   +---+---+---+--
//   |
//
// Since half pixels don't exist, antialiasing will be used and a
// gray line with a two-pixel width will be drawn:
//
//   +---+---+---+--
//   |xxxxxxx|   |
//   +xxxxxxx+---+--
//   |xxxxxxx|   |
//   +---+---+---+--
//   |
//
// To get a single pixel wide line, the coordinate must be (1.5, 0.5)
// to (1.5, 2.5). This is what happens in the moveTo and lineTo calls
// below.
//
//
function make_rect_path(context, r)
{
  assert(valid_bounds(r));

  var d = 0.5;

  context.beginPath();
  context.moveTo(to_int(r.x)+d,     to_int(r.y)+d);
  context.lineTo(to_int(r.x+r.w)-d, to_int(r.y)+d);
  context.lineTo(to_int(r.x+r.w)-d, to_int(r.y+r.h)-d);
  context.lineTo(to_int(r.x)+d,     to_int(r.y+r.h)-d);
  context.lineTo(to_int(r.x)+d,     to_int(r.y)+d);
}

// outlines and fills a 3d rect, with a gradient. If 'up' is
// true, the gradient will be light->dark from the top down; this will
// be reversed if 'up' is false. If 'lighter' is true, the gradient
// has the same orientation but will use lighter colors.
//
// this corresponds to how a button works (up/down will reverse the
// gradient when the button is pressed, 'lighter' is used when
// hovered)
//
function fill_3d_rect(context, up, lighter, r)
{
  assert(valid_bounds(r));

  var lightest = new color().white();
  var light = new color(0.82, 0.81, 0.78);
  var dark = new color(0.50, 0.50, 0.50);
  var darkest = new color(0.25, 0.25, 0.25);
  var fill = ui.theme.face_color();

  if (!up)
  {
    lightest = new color().black();
    darkest = new color().white();
    light = new color(0.50, 0.50, 0.50);
    dark = new color(0.82, 0.81, 0.78)
  }

  if (lighter)
    fill = ui.theme.hovered_face_color();

  fill_rect(context, fill, r);

  draw_line(context, lightest, new rectangle(
    r.x, r.y, 1, r.h));

  draw_line(context, lightest, new rectangle(
    r.x, r.y, r.w, 1));


  draw_line(context, darkest, new rectangle(
    r.x + r.w - 1, r.y, 1, r.h + 1));

  draw_line(context, darkest, new rectangle(
    r.x, r.y + r.h - 1, r.w + 1, 1));


  deflate(r, 1);

  draw_line(context, light, new rectangle(
    r.x, r.y, 1, r.h));

  draw_line(context, light, new rectangle(
    r.x, r.y, r.w, 1));


  draw_line(context, dark, new rectangle(
    r.x + r.w - 1, r.y, 1, r.h + 1));

  draw_line(context, dark, new rectangle(
    r.x, r.y + r.h - 1, r.w + 1, 1));
}

// outlines and fills the given rounded rectangle using the given
// color. See make_rect_path() for the d = 0.5.
//
function fill_rounded_rect(context, c, r)
{
  assert(valid_bounds(r));

  var d = 0.5;
  var rad = 7;

  if (c.string)
    context.fillStyle = c.string();
  else
    context.fillStyle = c;
  
  context.strokeStyle = "rgb(0, 0, 0)";

  context.beginPath();
  context.moveTo(to_int(r.x)+rad, to_int(r.y)+d);
  
  context.arcTo(
    to_int(r.x+r.w)-d, to_int(r.y)+d,
    to_int(r.x+r.w)-d, to_int(r.y+r.h)+d, rad);

  context.arcTo(
    to_int(r.x+r.w)-d,  to_int(r.y+r.h)-d,
    to_int(r.x)+d,      to_int(r.y+r.h)-d, rad);

  context.arcTo(
    to_int(r.x)+d, to_int(r.y+r.h)-d,
    to_int(r.x)+d, to_int(r.y)+d, rad);

  context.arcTo(
    to_int(r.x)+d,    to_int(r.y)-d,
    to_int(r.x+rad),  to_int(r.y)+d, rad);
  
  context.stroke();
  context.fill();
}

// draws the given image on the context. The width and height of 'r'
// are currently ignore (not clipped). 'i' must be an Image object.
// 'alpha' is the transparency to apply when drawing the image.
//
function draw_image(context, i, r, alpha)
{
  assert(valid_bounds(r));
  assert(i.src != undefined);

  if (alpha == undefined)
    alpha = 1.0;
  
  if (alpha != 1.0)
  {
    context.save();
    context.globalAlpha = alpha;
  }
  
  context.drawImage(i, r.x, r.y);
  
  if (alpha != 1.0)
    context.restore();
}

// draws the given text 's' in the given rectangle 'r' with the color
// 'c'. 'font' is mandatory. The top-left coordinate of the rectangle
// is the top left of the string. The string is clipped to this
// rectangle.
//
// todo: this uses g_line_height and g_line_spacing to format, which
// is crap.
//
function draw_text(context, s, c, r, font)
{
  assert(s != undefined);
  assert(c != undefined && c.internal_is_a_color);
  assert(r != undefined && r.internal_is_a_rectangle);
  assert(font != undefined && font.internal_is_a_font);
  assert(valid_bounds(r));

  context.save();

  clip(context, r);

  context.font = font.string();
  context.textBaseline = "top";
  context.fillStyle = c.string();

  var p = new point(r.x, r.y);

  var lines = explode(s, "\n");
  for (var i in lines)
  {
    var y = p.y + i*(g_line_height + g_line_spacing);
    assert(is_number(y));

    context.fillText(lines[i], p.x, y);
  }

  context.restore();
}

// returns the dimensions of the given string for the given font. If
// the text has multiple lines (with \n), the widest line is used.
//
// todo: this uses g_line_height and g_line_spacing to format, which
// is crap.
function text_dimension(s, font)
{
  assert(s != undefined);
  assert(font != undefined);
  assert(font.internal_is_a_font);

  var context = get_context();
  
  // getting an array of lines
  var lines = explode(s, "\n");
  if (lines.length === 0)
    return new dimension(0, 0);

  context.save();
  context.font = font.string();
  
  // widest line
  var w = 0;
  for (var i in lines)
    w = Math.max(context.measureText(lines[i]).width, w);
  
  var h = 
    lines.length * g_line_height +
    (lines.length - 1) * g_line_spacing;

  context.restore();
    
  return new dimension(w, h);
}

// returns a new grayscale image based on the given image. This is
// mostly used by disabled labels (such as on buttons). Note that this
// uses a temporary canvas object and does not modify the game canvas.
//
function create_grayscale(image)
{
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');

  var w = image.width;
  var h = image.height;

  canvas.width = w;
  canvas.height = h;
  
  context.drawImage(image, 0, 0);

  // p is an array of r, g, b and a values
  var p = context.getImageData(0, 0, w, h);

  // r, g and b are scaled to 30%, 59% and 11% respectively, added
  // and scaled to [0.5, 1.0] so that it is rather light.
  for(var y=0; y<p.height; ++y)
  {
    for(var x=0; x<p.width; ++x)
    {
      // each pixel is split in 4 elements: r, g, b and a
      var i = y * 4 * p.width + x * 4;

      var r = p.data[i];
      var g = p.data[i];
      var b = p.data[i];

      var gray = (r*0.30 + g*0.59 + b*0.11);
      gray = (gray / 2) + 128;

      p.data[i] = gray;
      p.data[i + 1] = gray;
      p.data[i + 2] = gray;
    }
  }
  
  // drawing back the grayscale image
  context.putImageData(p, 0, 0, 0, 0, p.width, p.height);  
  
  // creating image from the data
  var img = document.createElement("img");
  img.src = canvas.toDataURL();
  
  return img;
}
