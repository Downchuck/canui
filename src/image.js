// $Id$

namespace("ui", {

// a simple image with a possible overlay; both can be grayed when the
// control is disabled. If an image is unavailable (not loaded, bad
// uri, etc.), its alt text will be displayed.
//
// the images must be Image objects
//
//  image (image_holder object), default: undefined
//    initial image
//
//  overlay (image_holder object), default: undefined
//    initial overlay
//
//  margin (positive integer), default: 5
//    space around the image
//
//  halign (left, center, right), default: center
//    horizontal alignement of the image
//
//  valign (top, center, bottom), default: center
//    vertical alignment of the image
//
//  overlay_halign (left, center, right), default: center
//    horizontal alignment of the overlay (if present) over the main
//    image (not the available space, ignored if both images have the
//    same size)
//
//  overlay_valign (top, center, bottom), default: center
//    vertical alignment of the overlay (if present) over the main
//    image (not the available space, ignored if both images have the
//    same size)
//
//  overlay_grayed (true/false), default: true
//    when the control is disabled, also gray out the overlay
//
//  alpha ([0.0, 1.0]), default: 1.0
//    transparency of the overlay
//
image: function(opts)
{
  ui.inherit_control(this, opts);
  var self = this;

  var image_ = {normal: undefined, disabled: undefined};
  var overlay_ = {normal: undefined, disabled: undefined};

  var init = function()
  {
    self.set_default_options({
      image: undefined,
      overlay: undefined,
      margin: 0,
      halign: "center",
      valign: "center",
      overlay_halign: "center",
      overlay_valign: "center",
      overlay_grayed: true,
      alpha: 1.0});

    assert(one_of(self.option("halign"), ["left", "center", "right"]));
    assert(one_of(self.option("valign"), ["top", "center", "bottom"]));
    assert(one_of(self.option("overlay_halign"), ["left", "center", "right"]));
    assert(one_of(self.option("overlay_valign"), ["top", "center", "bottom"]));
    assert(one_of(self.option("overlay_grayed"), [true, false]));
    assert(self.option("alpha") >= 0.0 && self.option("alpha") <= 1.0);

    if (self.option("image") != undefined)
      self.image(self.option("image"));

    if (self.option("overlay") != undefined)
      self.overlay(self.option("overlay"));
  };

  // if i is not undefined, sets the image; in any case returns the
  // current image
  //
  self.image = function(i)
  {
    if (i != undefined)
    {
      assert(i.internal_is_a_image_holder);

      image_.normal = i;
      i.on_load.add(function()
        {
          self.relayout();
          return false;
        });

      self.relayout();
    }

    return image_.normal;
  }

  // if i is not undefined, sets the overlay; in any case returns the
  // current image
  //
  self.overlay = function(i)
  {
    if (i != undefined)
    {
      assert(i.internal_is_a_image_holder);

      overlay_.normal = i;
      i.on_load.add(function()
        {
          self.relayout();
          return false;
        });

      self.relayout();
    }

    return overlay_.normal;
  };

  // margins + largest image
  //
  self.best_dimension = function()
  {
    if (image_.normal == undefined)
      return new dimension(0, 0);

    var d = new dimension(
      image_.normal.width(), image_.normal.height());

    if (overlay_.normal != undefined)
    {
      d.w = Math.max(d.w, overlay_.normal.width());
      d.h = Math.max(d.h, overlay_.normal.height());
    }

    d.w += self.option("margin")*2;
    d.h += self.option("margin")*2;

    assert(valid_dimension(d));
    return d;
  };

  var make_image_bounds = function(i)
  {
    var r = self.bounds();

    if (i.working())
    {
      if (self.option("halign") == "center")
        r.x = r.x + r.w/2 - i.width()/2;
      else if (self.option("halign") == "right")
        r.x = r.x + r.w - i.width() - self.option("margin");
    
      if (self.option("valign") == "center")
        r.y = r.y + r.h/2 - i.height()/2;
      else if (self.option("valign") == "bottom")
        r.y = r.y + r.h - i.height() - self.option("margin");

      r = new rectangle(r.x, r.y, i.width(), i.height());
      assert(valid_bounds(r));
    }

    return r;
  }

  var make_overlay_bounds = function(r, i)
  {
    if (self.option("overlay_halign") == "center")
      r.x = r.x + r.w/2 - i.width()/2;
    else if (self.option("overlay_halign") == "right")
      r.x = r.x + r.w - i.width();

    if (self.option("overlay_valign") == "center")
      r.y = r.y + r.h/2 - i.height()/2;
    else if (self.option("overlay_valign") == "bottom")
      r.y = r.y + r.h - i.height();

    var b = new rectangle(r.x, r.y, i.width(), i.height());
    assert(valid_bounds(b));

    return b;
  }

  // returns the normal image if loaded; this will load the grayscale
  // on the fly (but may still return undefined if it is not finished
  // loading)
  //
  var current_image_impl = function(i, is_normal)
  {
    if (is_normal)
    {
      return i.normal;
    }
    else
    {
      // disabled image is ready, return it
      if (i.disabled != undefined)
        return i.disabled;

      // if there is no main image, there can't be any disabled image
      if (i.normal == undefined)
        return undefined;

      // if the main image isn't working, creating a grayscale is
      // impossible; return the main image so its alt text can be
      // displayed
      if (!i.normal.working())
        return i.normal;

      // if there is a main image but no disabled image, create it on
      // the fly and return undefined; relayout() will be called in
      // time
      i.disabled = create_grayscale(i.normal, function()
        {
          self.relayout();
          return false;
          });

      return i.disabled;
    }
  }

  // returns the normal main image if displayable, or undefined
  //
  var current_image = function()
  {
    return current_image_impl(image_, self.enabled());
  };

  // returns the normal overlay image if displayable, or undefined
  //
  var current_overlay = function()
  {
    return current_image_impl(
      overlay_, self.enabled() || !self.option("overlay_grayed"));
  };

  // draws the image
  //
  self.draw = function(context)
  {
    var i = current_image();
    var o = current_overlay();

    if (i != undefined)
    {
      // drawing main image
      var r = make_image_bounds(i);
      draw_image(context, i, r);

      if (o != undefined)
      {
        r = make_overlay_bounds(r, o);
        draw_image(context, o, r, self.option("alpha"));
      }
    }

    self.control__draw(context);
  };

  self.typename = function()
  {
    var s = "image ";

    if (image_.normal != undefined)
      s += "src:" + image_.normal.image().src + " ";

    if (overlay_.normal != undefined)
      s += "ov:" + overlay_.normal.image().src;

    return s;
  }
  
  init();
}

});   // namespace ui
