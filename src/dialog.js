// $Id$

namespace("ui", {

titlebar: function(d, opts)
{
  ui.inherit_container(this, merge(opts, {
    layout: new ui.border_layout({margin: 3})}));
  var self = this;
  self.internal_is_a_titlebar = true;

  var dialog_ = d;
  var caption_ = new ui.label();

  var init = function()
  {
    self.set_default_options({
      caption: ""
    });

    caption_.font().bold(true);

    caption_.caption(self.option("caption"));
    caption_.option("color", ui.theme.selected_text_color());

    self.add(caption_, ui.sides.left);
  };

  self.best_dimension = function()
  {
    return new dimension(0, 18);
  };

  self.draw = function(context)
  {
    fill_rect(context, ui.theme.selected_text_background(), self.bounds());
    self.container__draw(context);
  };

  self.typename = function()
  {
    return "titlebar";
  };

  init();
},

inherit_dialog: function(self, opts)
{
  ui.inherit_container(self, merge(opts, {
    layout: new ui.border_layout()}));

  self.internal_is_a_dialog = true;

  var title_ = new ui.titlebar(self, {caption: "test"});
  var pane_ = new ui.panel();


  var init = function()
  {
    self.borders({all: 1});

    self.container__add(title_, ui.sides.top);
    self.container__add(pane_, ui.sides.center);
  };

  self.dialog__best_dimension = function()
  {
    return new dimension(300, 300);
  };

  self.dialog__draw = function(context)
  {
    fill_rect(context, ui.theme.face_color(), self.bounds());

    self.container__draw(context);
  };

  self.typename = function()
  {
    return "dialog";
  }


  self.best_dimension   = self.dialog__best_dimension;
  self.draw             = self.dialog__draw;

  init();
},

dialog: function(opts)
{
  ui.inherit_dialog(this, opts);
}

});
