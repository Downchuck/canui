// $Id$

namespace("ui", {

// dropdown panel that contains the list; this is needed so the best
// dimension are adjusted for the textbox size
//
cb_panel: function(cb, list, opts)
{
  ui.inherit_container(this, merge(opts,
    {layout: new ui.border_layout()}));

  var cb_ = cb;
  var list_ = list;

  this.best_dimension = function()
  {
    var lbd = list_.best_dimension();
    var min = cb.width();

    return new dimension(
      Math.max(min, lbd.w), lbd.h);
  };
},

cb_text: function(cb, opts)
{
  ui.inherit_textbox(this, opts);
  var self = this;

  var cb_ = cb;

  self.on_mouse_left_down = function(mp)
  {
    if (self.option("unresponsive"))
    {
      cb_.open();
      return true;
    }
    else
    {
      return self.textbox__on_mouse_left_down(mp);
    }
  }
},

// options:
//   dropstyle (edit, list), default: list
//     if 'edit', the textbox is editable
//
inherit_combobox: function(self, opts)
{
  ui.inherit_container(self, merge(opts,
    {layout: new ui.border_layout({margin: 1})}));
  
  var text_ = new ui.cb_text(self);
  var drop_ = new ui.button({toggle: true, fast: true});
  var list_ = new ui.list({
    show_header: false, track: true, padding: 2,
    expand_header: true
    });
  var panel_ = new ui.cb_panel(self, list_);

  var init = function()
  {
    self.set_default_options({
      dropstyle: "edit"
    });

    self.borders({all: 1});

    var i = new ui.image({image: load_image("down.png", "v")});
    drop_.label(i);
    drop_.down.add(on_drop);

    text_.minimum_size(new dimension(10, 1));

    if (self.option("dropstyle") == "list")
      text_.option("unresponsive", true);

    text_.borders({all: 0});

    self.add(text_, ui.sides.center);
    self.add(drop_, ui.sides.right);
    panel_.add(list_, ui.sides.center);
    
    list_.add_column("");
    list_.add_item(["test1"]);
    list_.add_item(["test2"]);
    list_.add_item(["test3"]);
    list_.add_item(["test4"]);

    list_.on_item_clicked.add(on_selection);
  };

  var on_drop = function()
  {
    if (panel_.parent() != undefined)
      self.close();
    else
      self.open();
  };

  var on_selection = function()
  {
    self.close();

    var s = list_.selection();
    assert(s.length != 0);

    text_.text(s[0].caption(0));
    text_.select_all();
    text_.focus();
  }

  self.close = function()
  {
    assert(panel_.parent() != undefined);
    
    drop_.pressed(false);
    panel_.remove();
  };

  self.open = function()
  {
    assert(panel_.parent() == undefined);

    var rp = self.get_root_panel();
    assert(rp != undefined);

    var p = new point(
      self.position().x,
      self.position().y + text_.position().y + text_.height());
    p = self.parent().local_to_absolute(p);

    panel_.position(p);
     
    drop_.pressed(true);
    rp.add_floating(panel_);
  };

  init();
},

combobox: function(opts)
{
  ui.inherit_combobox(this, opts);
}

});   // namespace ui
