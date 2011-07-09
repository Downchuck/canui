// $Id$

namespace("ui",
{

// a label can contain a caption and/or an image. The image will be
// grayed when the label is disabled.
//
// options:
// image_align (right, left), default: right
//   the position of the image relative to the caption
//   note: ignored if there's no caption
//
// halign (left, center, right), default: left
//   horizontal position of the rectangle bounding both the image and
//   the caption
//
// valign (top, center, bottom), default: center
//   vertical position of the rectangle bounding both the image and
//   the caption
//
// padding (positive integer), default: 4
//   space between caption and image
//   note: ignored if either caption or image is missing
//
// color (color object), default: ui.theme.text_color()
//   text color
//
label: function(caption, image, opts)
{
  ui.inherit_control(this, opts);
  var self = this;

  // text
  var caption_ = "";

  // normal image
  var active_image_ = undefined;

  // image when disabled
  var disabled_image_ = undefined;


  // constructor
  //
  var init = function(caption, image)
  {
    self.set_default_options({
      image_align: "right",
      halign: "left",
      valign: "center",
      padding: 4,
      color: ui.theme.text_color()});
    
    assert(one_of(self.option("image_align"), ["left", "right"]));
  
    self.caption(caption);
    self.set_image(image);
  };

  // sets the text on the label
  //  
  self.caption = function(s)
  {
    if (s != undefined)
    {    
      // make sure 's' is a string
      caption_ = "" + s;

      // dimension may have changed    
      self.relayout();
    }

    return caption_;
  };

  // sets the image on the label; 'i' must be an Image object
  //  
  self.set_image = function(i)
  {
    active_image_ = undefined;
    disabled_image_ = undefined;

    if (i != undefined)
    {
      // todo: disabled image is always generated, might be better to
      // create it on the fly when needed
      active_image_ = i;

      // todo: wait after i is loaded
      disabled_image_ = create_grayscale(i);
      
      // will relayout when both images are loaded
      require_loaded(active_image_, mem_fun('relayout', self));
      require_loaded(disabled_image_, mem_fun('relayout', self));
    }
  };

  // sets the text color
  //
  self.text_color = function(c)
  {
    self.option("color", c);
    self.redraw();
  };
  
  // size of the image (if present) and caption (if present) plus
  // padding
  self.best_dimension = function()
  {
    // note that caption_dim will be 0 if there's no caption
    var d = text_dimension(caption_, self.font());
      
    if (active_image_ != undefined)
    {
      // add padding if there's a caption
      if (caption_ !== "")
        d.w += self.option("padding");
        
      d.w += active_image_.width;
      d.h = Math.max(d.h, active_image_.height);
    }
     
    assert(valid_dimension(d));
    return d;
  };
  
  // returns the bounds for the caption and image, only taking
  // image_align into account
  //
  var get_left_aligned_parts = function()
  {
    var cr = new rectangle(0, 0, 0, 0);
    var ir = new rectangle(0, 0, 0, 0);
    var image_padding = 0;

    var x = self.position().x;
    var y = self.position().y;

    var td = text_dimension(caption_, self.font());
    
    // the first part, whether the image or the caption, depending on
    // image_align, starts from the the x,y position of the label.
    // coordinates are relative to the parent, not the label (because
    // drawing is relative to the parent)
    //
    // the second part of positioned right after the first part,
    // separated by padding

    if (self.option("image_align") == "left")
    {
      if (active_image_ != undefined)
      {
        ir = new rectangle(
          x, y, active_image_.width, active_image_.height);
        
        image_padding = self.option("padding");
      }
      
      cr = new rectangle(ir.x + ir.w + image_padding, y, td.w, td.h);
    }
    else
    {
      cr = new rectangle(x, y, td.w, td.h);
    
      if (active_image_ != undefined)
      {
        if (caption_ !== "")
          image_padding = self.option("padding");
    
        ir = new rectangle(
          cr.x + cr.w + image_padding, y,
          active_image_.width, active_image_.height);
      }
    }

    return {"image": ir, "caption": cr, "padding": image_padding};
  }

  // returns the bounds the caption and image, only taking halign
  // into account
  //
  var halign_parts = function(p)
  {
    // this takes both parts (as a rectangle bounding them) and aligns
    // them horizontally

    var ir = p.image;
    var cr = p.caption;

    // total width of the caption and the image, plus padding; this is
    // the bounding rectangle of the two parts
    var cw = cr.w + p.padding + ir.w;

    // this is the horizontal position of the bounding rectangle
    // so that the parts are centered
    var x=self.position().x;

    if (self.option("halign") == "center")
    {
      x = self.position().x + self.width()/2 - cw/2;
    }
    else if (self.option("halign") == "right")
    {
      x = self.position().x + self.width() - cw;
    }
    else // if (self.option("halign") == "left")
    {
      // noop, parts are already left-aligned
    }

    // once x is determined, the parts are layed out from it

    if (self.option("image_align") == "left")
    {
      ir.x = x;
      cr.x = ir.x + ir.w;
      
      if (active_image_ != undefined)
       cr.x += p.padding;
    }
    else // if (self.option("image_align") == "right")
    {
      cr.x = x;
      ir.x = cr.x + cr.w;
      
      if (caption_ != "")
        ir.x += p.padding;
    }

    return {"image": ir, "caption": cr, "padding": p.padding};
  }

  // returns the bounds the caption and image, only taking valign
  // into account
  //
  var valign_parts = function(p)
  {
    var cr = p.caption;
    var ir = p.image;

    if (self.option("valign") == "center")
    {
      cr.y = self.position().y + self.height()/2 - cr.h/2;
      ir.y = self.position().y + self.height()/2 - ir.h/2;
    }
    else if (self.option("valign") == "bottom")
    {
      cr.y = self.position().y + self.height() - cr.h;
      ir.y = self.position().y + self.height() - ir.h;
    }
    else // if (self.option("valign") == "top")
    {
      // noop, parts are already top-aligned
    }

    return {"image": ir, "caption": cr, "padding": p.padding};
  }

  // returns the bounds for the caption and image
  //
  var get_parts = function()
  {
    var p = get_left_aligned_parts();
    p = halign_parts(p);
    p = valign_parts(p);

    return p;
  }

  // draws the image and caption
  //
  self.draw = function(context)
  {
    self.control__draw(context);

    var p = get_parts();

    // when disabled, the label will gray the text and use the
    // grayscale image

    if (caption_ !== "")
    {
      var c = self.option("color");
      if (!self.enabled())
        c = ui.theme.disabled_text_color();
      
      draw_text(context, caption_, c, p.caption, self.font());
    }

    if (active_image_ != undefined)
    {
      var i = active_image_;
      if (!self.enabled())
        i = disabled_image_;

      draw_image(context, i, p.image);
    }
  };
  
  // debug: returns the caption
  //
  self.typename = function()
  {
    return "label (" + caption_ + ")";
  };
  
  init(caption, image);
}

});   // namespace ui
