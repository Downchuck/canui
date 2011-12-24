// $Id$

namespace("ui",
{

// a label contains a caption.
//
// options:
// caption (string), default: ""
//   initial caption
//
// halign (left, center, right), default: left
//   horizontal position of the caption
//
// valign (top, center, bottom), default: center
//   vertical position of the caption
//
// color (color object), default: ui.theme.text_color()
//   text color
//
inherit_label: function(self, opts)
{
  ui.inherit_control(self, opts);

  // text
  var caption_ = "";


  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      caption: "",
      halign: "left",
      valign: "center",
      color: ui.theme.text_color()});
    
    if (self.option("caption") != undefined)
      self.caption(self.option("caption"));
  };

  // sets the text on the label
  //  
  self.label__caption = function(s)
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
  
  // size of the caption 
  //
  self.label__best_dimension = function()
  {
    return text_dimension(caption_, self.font());
  };
  
  // draws the caption
  //
  self.label__draw = function(context)
  {
    if (caption_ != "")
    {
      var b = self.bounds();
      var d = text_dimension(caption_, self.font());

      if (self.option("halign") == "center")
        b.x = b.x + b.w/2 - d.w/2;
      else if (self.option("halign") == "right")
        b.x = b.x + b.w - d.w;
      
      if (self.option("valign") == "center")
        b.y = b.y + b.h/2 - d.h/2;
      else if (self.option("valign") == "bottom")
        b.y = b.y + b.h - d.h;

      // when disabled, the label will gray the text

      var c = self.option("color");
      if (!self.enabled())
        c = ui.theme.disabled_text_color();
      
      draw_text(context, caption_, c, b, self.font());
    }

    self.control__draw(context);
  };
  
  // debug: returns the caption
  //
  self.typename = function()
  {
    return "label (" + caption_ + ")";
  };

  self.caption          = self.label__caption;
  self.best_dimension   = self.label__best_dimension;
  self.draw             = self.label__draw;
  
  init();
},

label: function(opts)
{
  ui.inherit_label(this, opts);
}

});   // namespace ui
