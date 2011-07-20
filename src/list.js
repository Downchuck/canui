// $Id$

namespace("ui", {

// hit test parts
//
list_parts:
{
  // the point is above the first item (such as between the header and
  // the first item)
  above: 0x01,

  // the point is below the last item
  below: 0x02,

  // the point is in the margin before the start of the item (up to
  // the start of the focus ring)
  before: 0x04,

  // the point is on the caption of an item (that is, there is text
  // under the cursor)
  caption: 0x08,

  // the point is inside a column, but not over a caption (such as in
  // the space between two captions on the same line)
  nowhere: 0x10,
  
  // the point is after the last column
  after:   0x20,

  
  // combines above, below, before and after; not on an item
  not_on_item: 0x01 | 0x02 | 0x04 | 0x20,

  // combines caption and nowhere; on an item
  on_item: 0x08 | 0x10,

  // combines before, caption, nowhere and after; there is an item on
  // this line
  on_item_line: 0x04 | 0x08 | 0x10 | 0x20
},

list_lexicographic_sorter: function(a, b, i)
{
  var c1 = a.caption(i);
  var c2 = b.caption(i);

  if (c1 < c2)
    return -1;
  else if (c1 > c2)
    return 1;
  return 0;
},

list_logical_sorter: function(a, b, i)
{
  var c1 = a.caption(i);
  var c2 = b.caption(i);

  return logical_compare(c1, c2);
},

// an item in a list; this contains an array of captions (for the
// columns) and the item state (such as the selection)
//
list_item : function(caption)
{
  // one caption per column
  var captions_ = [];

  // whether the item is currently selected
  var selected_ = false;


  // constructor
  //
  var init = function(captions)
  {
    for (var i in caption)
      captions_.push("" + caption[i]);
  };

  // if b is not undefined, sets the selected state; in any case
  // returns the current selected state
  //
  this.selected = function(b)
  {
    if (b != undefined)
      selected_ = b;
    return selected_;
  };

  // if s is not undefined, sets the caption of the column 'i'; this
  // assumes that 'i' is a valid column. In any case returns the
  // current caption of the given column.
  //
  this.caption = function(i, s)
  {
    assert(i >= 0 && i < captions_.length);

    if (s != undefined)
      captions_[i] = s;

    return captions_[i];
  };

  init(caption);
},

// a column in the list
//
list_column: function(caption, width)
{
  var self = this;

  var caption_ = caption;
  var width_ = (width == undefined ? 0 : width);
  var sorter_ = ui.list_logical_sorter;
  var sort_ = 0;

  // constructor
  //
  var init = function()
  {
  };

  self.caption = function(c)
  {
    if (c != undefined)
      caption_ = c;

    return caption_;
  };

  self.width = function(w)
  {
    if (w != undefined)
      width_ = w;

    return width_;
  };

  self.sorter = function(s)
  {
    if (s != undefined)
      sorter_ = s;

    return sorter_;
  }

  self.current_sorter = function(s)
  {
    if (sort_ == 1)
    {
      return sorter_;
    }
    else
    {
      return function(a, b, i)
        {
          return -sorter_(a, b, i);
        };
    }
  }

  self.toggle_sort_direction = function()
  {
    if (sort_ == 1)
      sort_ = -1;
    else
      sort_ = 1;
  }

  self.sort_direction = function(v)
  {
    if (v != undefined)
    {
      assert(v == -1 || v == 0 || v == 1);
      sort_ = v;
    }
    
    return sort_;
  }

  init();
},

// a row of clickable headers
//
list_header: function(parent)
{
  ui.inherit_container(this, {layout: new ui.absolute_layout()});
  var self = this;

  self.clicked = new signal();


  // list object
  var parent_ = parent;

  // header buttons
  var headers_ = undefined;

  // columns
  var cols_ = undefined;


  var init = function()
  {
  };

  // returns the width in pixels of the header for the given column
  //
  self.header_width = function(i)
  {
    if (headers_ == undefined)
      return 0;

    assert(i >= 0 && i < headers_.length);
    return headers_[i].best_dimension().w
  }

  // returns the column index at the given coordinate (relative to
  // this control)
  //
  self.index = function(p)
  {
    var x = 0;
    for (var i=0; i<headers_.length; ++i)
    {
      var c = headers_[i];
      var w = c.width();

      if (p.x >= x && p.x < (x + w))
        return i;

      x += w;
    }

    return -1;
  }

  var set_button = function(b, c)
  {
    var p = new ui.panel({layout: new ui.border_layout({padding: 5})});
    p.add(new ui.label({caption: c.caption()}), ui.sides.left);

    p.add(new ui.spacer({size: new dimension(1, 1)}), ui.sides.center);

    if (c.sort_direction() == -1)
      p.add(new ui.image({image: load_image("up.png", "^")}), ui.sides.right);
    else if (c.sort_direction() == 1)
      p.add(new ui.image({image: load_image("down.png", "v")}), ui.sides.right);

    b.label(p);
  }

  var recreate_buttons = function()
  {
    self.remove_all();
    headers_ = [];

    for (var i=0; i<cols_.length; ++i)
    {
      var c = cols_[i];

      var b = new ui.button();
      b.clicked.add(bind(on_clicked, i));

      headers_.push(b);
      self.add(b);
    }
  }

  self.refresh = function()
  {
    var highest = 0;
    var total_width = 0;
    var x = 0;

    if (headers_ == undefined || (headers_.length != cols_.length))
      recreate_buttons();

    assert(headers_.length == cols_.length);

    for (var i=0; i<headers_.length; ++i)
    {
      var b = headers_[i];
      var c = cols_[i];

      set_button(b, c);

      var bd = b.best_dimension();
      highest = Math.max(highest, bd.h);

      // height will be set after
      b.bounds(new rectangle(x, 0, c.width(), 0));
      
      total_width += c.width();
      x += c.width();
    }

    // setting the height to the highest
    for (var i=0; i<headers_.length; ++i)
    {
      var c = headers_[i];

      var r = c.bounds();
      r.h = highest;

      c.bounds(r);
    }

    self.layout().set_best_dimension(
      new dimension(total_width, highest));
  }

  var on_clicked = function(i)
  {
    self.clicked.fire(i);
  }

  // creates as many buttons are there are captions; all the buttons
  // will have the height of the largest
  //
  self.set = function(cols)
  {
    cols_ = cols;
    self.refresh();

  }

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "list_header";
  }

  init();
},

// scollable list of items and a clickable header
//
// the list can be frozen so that columns won't be resized immediately
// while adding items; when the resize behaviour is "content", the
// item list would be walked through each time an item is added to
// get the longest item. Freezing the list will defer this until it
// is thawed.
//
// options:
//  item_height (positive integer), default: g_line_height + 4
//    height in pixels of an item; the text will be vertically
//    centered
//
//  padding (positive integer), default: 5
//    space on the left side of the items
//
//  column_resize (none, content, header, auto), default: auto
//    specifies how columns are resized: "content" uses the width of
//    the largest item and therefore might be slow for very long
//    lists; "header" uses the width of the column caption; "none"
//    requires the user to set the width manually; "auto" uses the
//    largest between content and header
//
//  show_header (true/false), default: true
//    whether the column headers should be visible
//
//  expand_header (true/false), default: true
//    whether the last column should be expanded to take the remaining
//    horizontal space
//
//  item_scroll (true/false), default: false
//    whether scrolling is per-pixel or per-item
//
//  track (true/false), default: false
//    the item under the mouse will be automatically selected without
//    having to click
//
//  multiple (true/false), default: true
//    whether multiple items can be selected
//
list: function(opts)
{
  ui.inherit_container(this,
    merge(opts, {layout: new ui.absolute_layout()}));
  var self = this;


  self.on_item_selection = new signal();
  self.on_item_clicked = new signal();
  self.on_item_double_click = new signal();

  // an array of list_item objects
  var items_ = [];

  // internal list so that selection is faster on large lists
  var selected_items_ = [];

  // while selecting the keyboard, the original item that had the
  // focus
  var pivot_ = -1;
  
  // an array of list_column objects
  var cols_ = [];

  // header buttons
  var header_ = new ui.list_header(self);

  // scroll bars
  var scroller_ = new ui.scroller({empty: true});
  //var vert_scroll_ = new ui.scrollbar();
  //var hor_scroll_ = new ui.scrollbar({orientation: "horizontal"});

  // scroll offset
  var origin_ = new point(0, 0);

  // when true, prevents updates when adding items
  var frozen_ = false;

  // focused item
  var focus_ = -1;

  var drag_start_ = undefined;
  var tentative_drag_ = false;
  var dragging_ = false;
  var tentative_delta_ = 5;
  var rect_ = undefined;
  var drag_timer_ = undefined;
  var drag_by_ = {horizontal: 0, vertical: 0};

  // an item is selected on list button down when the mouse is over
  // the caption, otherwise on button up; this is set to true on
  // mouse down selection so that mouse up doesn't try to do it again
  var selection_handled_ = false;

  // constructor
  //
  var init = function()
  {
    self.set_default_options({
      text_color: ui.theme.text_color(),
      item_height: g_line_height + 6,
      column_resize: "auto",
      show_header: true,
      expand_header: true,
      multiple: true,
      item_scroll: false,
      track: false,
      padding: 5
    });

    self.borders({"all": 1});
    self.needs_focus(true);

    if (self.option("show_header"))
      self.add(header_, ui.sides.top);

    self.add(scroller_);

    header_.clicked.add(on_header_clicked);

    scroller_.zorder("topmost");
    scroller_.vscroll.add(on_vert_scroll);
    scroller_.hscroll.add(on_hor_scroll);
  };
  
  // adds an item to the list
  //
  self.add_item = function(captions)
  {
    assert(captions.length == cols_.length);

    items_.push(new ui.list_item(captions));

    if (!frozen_)
      update();
  };

  // adds a column
  //
  self.add_column = function(name, width)
  {
    cols_.push(new ui.list_column(name, width));

    if (cols_.length == 1)
      cols_[0].sort_direction(1);

    if (!frozen_)
      update();
  };

  // returns the number of items in the list
  //
  self.item_count = function()
  {
    return items_.length;
  }

  // returns an array of list_item objects
  //
  self.items = function()
  {
    return items_;
  }

  self.frozen = function(b)
  {
    var needs_update = false;
    if (frozen_ && !b)
      needs_update = true;

    frozen_ = b;

    if (needs_update)
      update();
  }

  var on_header_clicked = function(c)
  {
    assert(c >= 0 && c < cols_.length);

    for (var i=0; i<cols_.length; ++i)
    {
      if (i == c)
        cols_[i].toggle_sort_direction();
      else
        cols_[i].sort_direction(0);
    }

    self.sort();
  }

  self.sort = function()
  {
    if (cols_ == undefined)
      return;

    for (var i=0; i<cols_.length; ++i)
    {
      if (cols_[i].sort_direction() != 0)
      {
        items_.sort(bind_3(cols_[i].current_sorter(), i));
        header_.refresh();
        self.redraw();

        break;
      }
    }
  }

  var update = function()
  {
    header_.set(cols_);
    self.sort();
    self.relayout();
  }

  var calculate_header_widths = function(fill)
  {
    var ws = [];
    var total_width = 0;

    var vw = viewport_bounds().w;

    for (var i=0; i<cols_.length; ++i)
    {
      var w = header_.header_width(i);

      ws.push(w);
      total_width += w
    }

    if (fill)
    {
      if (self.option("expand_header") && total_width < vw)
      {
        total_width = 0;
        for (var i=0; i<cols_.length - 1; ++i)
          total_width += ws[i];

        ws[cols_.length - 1] = vw - total_width;
      }
    }

    return ws;
  }

  var calculate_content_widths = function(fill)
  {
    var ws = [];
    var total_width = 0;

    var vw = viewport_bounds().w;

    for (var c=0; c<cols_.length; ++c)
    {
      var largest = 0;

      for (var i=0; i<items_.length; ++i)
      {
        var iw =
          self.option("padding") + 
          text_dimension(items_[i].caption(c), self.font()).w;

        if (c == 0)
          iw += self.option("padding");

        largest = Math.max(largest, iw);
      }

      ws.push(largest);
      total_width += largest;
    }

    if (fill)
    {
      if (self.option("expand_header") && total_width < vw)
      {
        total_width = 0;
        for (var i=0; i<ws.length - 1; ++i)
          total_width += ws[i];

        ws[ws.length - 1] = vw - total_width;
      }
    }

    return ws;
  }

  var calculate_auto_widths = function(fill)
  {
    var hws = calculate_header_widths(fill);
    var cws = calculate_content_widths(fill);
    assert(hws.length == cws.length);

    ws = [];
    var total_width = 0;

    for (var i=0; i<hws.length; ++i)
    {
      var w = Math.max(hws[i], cws[i]);
      ws.push(w);
      total_width += w;
    }

    if (fill)
    {
      var vw = viewport_bounds().w;

      if (self.option("expand_header") && total_width >= vw)
      {
        total_width = 0;
        for (var i=0; i<ws.length - 1; ++i)
          total_width += ws[i];

        ws[ws.length - 1] = vw - total_width;
      }
    }

    return ws;
  }

  var calculate_none_widths = function(fill)
  {
    var ws = [];

    for (var i=0; i<cols_.length; ++i)
      ws.push(cols_[i].width());

    if (fill && self.option("expand_header"))
    {
      var vw = viewport_bounds().w;

      var total_width = 0;
      for (var i=0; i<cols_.length - 1; ++i)
        total_width += cols_[i].width();

      if (total_width < vw)
        ws[ws.length - 1] = vw - total_width;
    }

    return ws;
  }

  var calculate_widths = function(fill)
  {
    if (self.option("column_resize") == "header")
      return calculate_header_widths(fill);
    else if (self.option("column_resize") == "content")
      return calculate_content_widths(fill);
    else if (self.option("column_resize") == "auto")
      return calculate_auto_widths(fill);
    else
      return calculate_none_widths(fill);
    
    return undefined;
  }

  // resizes each column depending on the resize option
  //
  var resize_columns = function()
  {
    if (cols_.length == 0)
      return;
      
    var ws = calculate_widths(true);
    if (ws != undefined)
    {
      for (var i=0; i<ws.length; ++i)
        cols_[i].width(ws[i]);

      header_.refresh();
    }
  }

  // on vertical scroll
  //
  var on_vert_scroll = function(v)
  {
    if (self.option("item_scroll"))
    {
      origin_.y =
        -to_int(v / self.option("item_height")) *
         self.option("item_height");
    }
    else
    {
      origin_.y = -v;
    }

    self.redraw();
  };

  // on horizontal scroll
  //
  var on_hor_scroll = function(v)
  {
    origin_.x = -v;

    //todo
    //self.on_bounds_changed();
    header_.position(new point(1 + origin_.x, header_.position().y));
    //self.redraw();
  };

  // resizes the columns to fit the list
  //
  self.on_bounds_changed = function()
  {
    if (cols_.length == 0)
      return;

    var header_r = new rectangle(
      1, 1, header_.best_dimension().w, header_.best_dimension().h);
    header_.bounds(header_r);

    var ub = usable_bounds();
    var ld = list_dimension();

    scroller_.bounds(new rectangle(
      1, 1, self.width() - 2, self.height() - 2));

    if (ld.h > ub.h)
      scroller_.vbar().limits(0, 1);
    else
      scroller_.vbar().limits(0, 0);
    
    if (ld.w > ub.w)
      scroller_.hbar().limits(0, 1);
    else
      scroller_.hbar().limits(0, 0);

    var vp = viewport_bounds();
    
    if (scroller_.vbar().visible())
    {
      scroller_.vbar().limits(0, ld.h - vp.h);
      scroller_.vbar().page_size(
          vp.h - self.option("item_height")*2);
    }

    if (scroller_.hbar().visible())
    {
      scroller_.hbar().limits(0, ld.w - vp.w);
      scroller_.hbar().page_size(0.90 * vp.w);
    }

    header_.set(cols_);
    resize_columns();

    var header_r = new rectangle(
      1 + origin_.x, 1, header_.best_dimension().w, header_.best_dimension().h);
    header_.bounds(header_r);
  }

  // todo: width is missing and this assumes (correctly?) that all
  // columns have the same height
  //
  self.best_dimension = function()
  {
    if (cols_.length == 0)
      return new dimension(100, 100);

    var ld = list_dimension();

    if (self.option("show_header"))
      ld.h += header_.height();

    if (scroller_.vbar().visible())
      ld.w += scroller_.vbar().best_dimension().w;

    // todo: why? border?
    ld.w += 2;
    ld.h += 3;

    return ld;
  };

  self.selection = function()
  {
    var s = [];

    for (var i in selected_items_)
      s.push(items_[selected_items_[i]]);

    return s;
  }

  self.selection_indices = function()
  {
    return clone(selected_items_);
  }

  // selects all the items having the given indices, unselecting
  // the rest
  //
  self.select_only = function(s)
  {
    if (s.length > 1 && !self.option("multiple"))
      s = [s[0]];

    for (var i in selected_items_)
      items_[selected_items_[i]].selected(false);

    selected_items_ = [];

    for (var i in s)
    {
      assert(s[i] != undefined);
      assert(items_[s[i]] != undefined);

      selected_items_.push(s[i]);
      items_[s[i]].selected(true);
    }

    if (s.length == 0)
      self.focus_item(-1);

    self.on_item_selection.fire();
    self.redraw();
  };

  // selects all the items having the given indices in addition to
  // the ones already selected
  //
  self.select = function(s)
  {
    if (s.length > 1 && !self.option("multiple"))
      s = [s[0]];

    var changed = false;

    for (var i in s)
    {
      assert(s[i] != undefined);
      assert(items_[s[i]] != undefined);

      var item = items_[s[i]];

      if (!item.selected())
      {
        selected_items_.push(s[i]);
        items_[s[i]].selected(true);
        changed = true;
      }
    }

    if (changed)
    {
      self.on_item_selection.fire();
      self.redraw();
    }
  }

  // inverts the selection state of all the given indices
  //
  self.select_reverse = function(s)
  {
    if (s.length > 1 && !self.option("multiple"))
      s = [s[0]];

    for (var i in s)
    {
      var b = !items_[s[i]].selected();

      items_[s[i]].selected(b);

      if (!b)
      {
        for (var j in selected_items_)
        {
          if (selected_items_[j] == i)
          {
            selected_items_.splice(j, 1);
            break;
          }
        }
      }
      else
      {
        selected_items_.push(s[i]);
      }
    }

    self.on_item_selection.fire();
    self.redraw();
  }

  // draws the header and all the items
  //
  self.draw = function(context)
  {
    assert(items_ != undefined);

    var r = offset_rect(
      viewport_bounds(),
      self.position().x, self.position().y);

    context.save();
    clip(context, r);

    fill_rect(context, new color().white(), r);

    r.x += origin_.x + self.option("padding");
    r.y += origin_.y;

    r.w = 0;
    for (var i=0; i<cols_.length; ++i)
      r.w += cols_[i].width();

    r.w -= self.option("padding");

    draw_items(context, r);

    if (rect_ != undefined)
    {
      var dr = new rectangle(
        self.position().x + rect_.x + origin_.x + 1,
        self.position().y + rect_.y + origin_.y + 1,
        rect_.w, rect_.h);

      fill_rect(context, new color(0.03, 0.14, 0.41, 0.3), dr);
      outline_rect(context, new color(0.03, 0.14, 0.41), dr);
    }

    context.restore();
    self.container__draw(context);
  };

  // makes sure the given item index is visible in the viewport;
  // 'where' can be:
  //   "bottom": the given item will be at the bottom of the viewport;
  //   "top": the given item will be at the top of the viewport;
  //   "center": the given item will be at the center of the viewport;
  //   "auto": the given item will be at the top or bottom depending
  //           on the current scroll position; the list won't be
  //           scrolled if the item is already visible
  //
  // if 'where' is undefined, it defaults to "auto"
  //
  self.scroll_to_item = function(i, where)
  {
    assert(i >= 0 && i <items_.length);

    if (where == undefined)
      where = "auto";

    if (where == "auto")
    {
      var b = self.item_bounds(i);
      var vr = visible_list_bounds();

      if (b.y < vr.y)
        scroll_to_item_impl(i, "top");
      else if ((b.y + b.h) > (vr.y + vr.h))
        scroll_to_item_impl(i, "bottom");
      else
        return;
    }
    else
    {
      scroll_to_item_impl(i, where);
    }
  }

  var scroll_to_item_impl = function(i, where)
  {
    assert(i >= 0 && i <items_.length);

    var b = self.item_bounds(i);
    var y = undefined;

    var vp = viewport_bounds();
    var ld = list_dimension();

    if (where == "bottom")
    {
      y = (b.y + b.h) - vp.h;
    }
    else if (where == "top")
    {
      y = b.y;
    }
    else if (where == "center")
    {
      y = b.y - vp.h/2 + b.h/2;
    }

    assert(y != undefined);
    
    if ((y + vp.h) > ld.h)
      y = ld.h - vp.h;

    if (y < 0)
      y = 0;

    scroller_.scroll_to(0, y);
    self.redraw();
  }

  // returns whether the given item index is visible; if 'complete'
  // is true, will return false unless the item's height is
  // completely in the viewport
  //
  self.item_visible = function(i, complete)
  {
    var r = self.item_bounds(i);
    var vr = visible_list_bounds();
    
    if (r.y >= vp.y && (r.y + r.h) < (vp.y + vp.h))
      return true;

    return false;
  }

  // returns the bounds of the given item index relative to the top-
  // left of the origin of the list; the width of the rectangle is the
  // viewport width
  //
  self.item_bounds = function(i)
  {
    assert(i >= 0 && i < items_.length);

    return new rectangle(
      0, i * self.option("item_height"),
      viewport_bounds().w, self.option("item_height"));
  }

  // draws all the items in the given rectangle
  //
  var draw_items = function(context, r)
  {
    if (items_.length == 0)
      return;

    var v = visible_items();
    var p = new point(r.x, r.y + (v.first * self.option("item_height")));

    for (var x=v.first; x<=v.last; ++x)
    {
      var item = items_[x];

      var ir = new rectangle(
        p.x, p.y, r.w, self.option("item_height"));

      draw_item(context, clone(ir), item, x);
      p.y += self.option("item_height");
    }
  };

  // draws the item 'i' in the given rectangle
  //
  var draw_item = function(context, r, item, index)
  {
    // selected items will have a different background and text color

    var c = self.option("text_color");

    if (item.selected())
    {
      fill_rect(context, ui.theme.selected_text_background(), r);
      c = ui.theme.selected_text_color();
    }

    if (focus_ == index)
    {
      var fc = undefined;
      if (items_[focus_].selected())
        fc = color_inverse(ui.theme.selected_text_background());
      else
        fc = new color().black();

      dotted_rect(context, fc, r);
    }

    var x = r.x;
    r.y = r.y + r.h/2 - g_line_height/2;
    var tw = 0;

    for (var j=0; j<cols_.length; ++j)
    {
      r.x = x + tw + self.option("padding");
      r.w = cols_[j].width() - self.option("padding");

      draw_text(context, item.caption(j), c, r, self.font());
      tw += r.w;
    }
  };

  var list_dimension = function()
  {
    var w = 0;

    var ws = calculate_widths(false);
    if (ws != undefined)
    {
      for (var i in ws)
        w += ws[i];
    }

    if (w == 0)
      w = 200;
    
    var h = self.option("item_height") * items_.length;
    if (h == 0)
      h = 100;
    
    return new dimension(w, h);
  }

  var usable_bounds = function()
  {
    var y = 0;

    if (self.option("show_header"))
      y += header_.height();

    return new rectangle(
      1, 1 + y,
      self.width()-2, self.height() - y - 2);
  }

  var viewport_bounds = function()
  {
    var r = usable_bounds();

    if (scroller_.vbar().visible())
      r.w -= scroller_.vbar().width();

    if (scroller_.hbar().visible())
      r.h -= scroller_.hbar().height();

    return r;
  }

  var visible_items = function(complete)
  {
    if (complete == undefined)
      complete = false;

    if (items_.length == 0)
      return {first: 0, last: 0};

    var r = viewport_bounds();
    var before = 0;
    var after = 0;
    
    var hidden_pixels = -origin_.y;

    var h = hidden_pixels % self.option("item_height");
    if (h > 0)
    {
      h = self.option("item_height") - h;
      ++before;
    }

    hidden_pixels += h;

    var hidden_count =
      to_int(hidden_pixels / self.option("item_height"));

    var visible_pixels = r.h - (hidden_pixels + origin_.y);
    
    var v = visible_pixels % self.option("item_height");
    if (v > 0)
    {
      visible_pixels -= (v - 1);
      ++after;
    }

    var visible_count =
      to_int(visible_pixels / self.option("item_height"));

    var first = hidden_count;
    var last = hidden_count + visible_count - 1;

    if (!complete)
    {
      first -= before;
      last += after;
    }

    if (last >= (items_.length - 1))
      last = items_.length - 1;

    return {"first": first, "last": last};
  };

  var visible_list_bounds = function()
  {
    return new rectangle(
      -origin_.x, -origin_.y,
      viewport_bounds().w, viewport_bounds().h);
  };

  self.focus_item = function(i)
  {
    assert(i >= -1 && i < items_.length);

    if (focus_ != i)
    {
      focus_ = i;

      if (focus_ != -1)
        self.scroll_to_item(focus_);

      self.redraw();
    }
  }

  // scrolls the list
  //
  self.on_mouse_scroll = function(mp, delta)
  {
    if (scroller_.vbar().visible())
    {
      scroller_.scroll_by(0, -delta * self.option("item_height"));

      if (tentative_drag_ || dragging_)
        check_drag(mp);
    }

    return true;
  }

  self.on_mouse_left_down = function(mp)
  {
    // skip the borders (todo)
    if (mp.y <= 1 || mp.y >= (self.height() - 2))
    {
      selection_handled_ = true;
      return;
    }

    if (mp.x <= 1 || mp.x >= (self.width() - 2))
    {
      selection_handled_ = true;
      return;
    }

    var ht = self.hit_test(mp);

    if (ht.part == ui.list_parts.caption)
    {
      handle_click_selection(ht.item);
      selection_handled_ = true;
    }
    else
    {
      if (!self.option("track") && self.option("multiple"))
      {
        drag_start_ = new point(
          -origin_.x + mp.x, -origin_.y + mp.y);

        tentative_drag_ = true;
        self.capture_mouse();
      }
    }

    return true;
  }

  // selects the item under the mouse, if any
  //
  self.on_mouse_left_up = function(mp)
  {
    var i = self.find_item(mp);
    assert(i != undefined);

    if (!dragging_)
    {
      if (!selection_handled_)
        handle_click_selection(i);

      if (i != -1)
        self.on_item_clicked.fire(items_[i]);
    }

    if (dragging_ || tentative_drag_)
    {
      self.release_mouse();
      tentative_drag_ = false;
      dragging_ = false;
      rect_ = undefined;

      if (drag_timer_ != undefined)
      {
        clearInterval(drag_timer_);
        drag_timer_ = undefined;
      }
    }

    selection_handled_ = false;
    self.redraw();

    return true;
  }

  var on_dragging = function()
  {
    var hta = self.hit_test(new point(rect_.x + origin_.x, rect_.y + origin_.y));
    var htb = self.hit_test(new point(rect_.x + origin_.x + rect_.w - 1, rect_.y + origin_.y + rect_.h - 1));
    var a = -1, b = -1;

    if (hta.part & ui.list_parts.above)
      a = 0;
    else if (hta.part & ui.list_parts.below)
      a = items_.length - 1;
    else
      a = hta.item;

    if (htb.part & ui.list_parts.above)
      b = 0;
    else if (htb.part & ui.list_parts.below)
      b = items_.length - 1;
    else
      b = htb.item;

    var r = range(a, b);

    if ((hta.part & ui.list_parts.below) && 
        (htb.part & ui.list_parts.below))
    {
      r = [];
    }
    else if ((hta.part & ui.list_parts.before) && 
             (htb.part & ui.list_parts.before))
    {
      r = [];
    }
    else if ((hta.part & ui.list_parts.after) && 
             (htb.part & ui.list_parts.after))
    {
      r = [];
    }
    else if ((hta.part & ui.list_parts.above) && 
             (htb.part & ui.list_parts.above))
    {
      r = [];
    }

    handle_mouse_selection(r, false);
    self.redraw();
  }

  self.on_mouse_move = function(mp)
  {
    if (self.option("track"))
    {
      var ht = self.hit_test(mp);

      if ((ht.part & ui.list_parts.on_item_line) && ht.item >= 0)
      {
        self.select_only([ht.item]);
      }
      else
      {
        self.select_only([]);
      }
    }
    else if (dragging_ || tentative_drag_)
    {
      check_drag(mp);

      if (tentative_drag_ || dragging_)
        return true;
    }
  }
  
  var check_drag = function(mp)
  {       
    var p = new point(
        -origin_.x + mp.x, -origin_.y + mp.y);

    var dx = p.x - drag_start_.x;
    var dy = p.y - drag_start_.y;

    if (tentative_drag_)
    {
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d > tentative_delta_)
      {
        tentative_drag_ = false;
        dragging_ = true;
      }
    }

    if (dragging_)
    {
      rect_ = new rectangle(
        drag_start_.x, drag_start_.y, dx, dy);

      if (drag_timer_ == undefined)
        on_dragging();

      check_outside_drag(mp);
    }
  };

  var check_outside_drag = function(mp)
  {
    var r = viewport_bounds();

    var hor = 0;
    if (mp.x < r.x)
      hor = mp.x - r.x;
    else if (mp.x >= (r.x + r.w))
      hor = mp.x - (r.x + r.w);

    var vert = 0;
    if (mp.y < r.y)
      vert = mp.y - r.y;
    else if (mp.y >= (r.y + r.h))
      vert = mp.y - (r.y + r.h);

    var inside = (hor == 0 && vert == 0);

    if (inside)
    {
      if (drag_timer_ != undefined)
      {
        clearInterval(drag_timer_);
        drag_timer_ = undefined;
      }

      return;
    }

    if (inside)
      return;

    if (hor > 0 && hor < 5)
      hor = 5;
    else if (hor < 0 && hor > -5)
      hor = -5;

    if (vert > 0 && vert < 5)
      vert = 5;
    else if (vert < 0 && vert > -5)
      vert = -5;

    drag_by_ = {horizontal: hor, vertical: vert};

    if (drag_timer_ == undefined)
      drag_timer_ = setInterval(auto_scroll, 100);
  }
  
  var auto_scroll = function()
  {
    var mp = self.get_root_panel().current_mouse_pos();
    mp = self.absolute_to_local(mp);

    scroller_.scroll_by(drag_by_.horizontal, drag_by_.vertical);

    var vp = viewport_bounds();

    var x = -origin_.x + mp.x;
    
    var y = -origin_.y + mp.y;
    if (drag_by_.vertical < 0)
      y = -origin_.y + vp.y - 1;
    else if (drag_by_.vertical > 0)
      y = -origin_.y + vp.y + vp.h + 1;

    var dx = x - drag_start_.x;
    var dy = y - drag_start_.y;

    rect_ = new rectangle(
      drag_start_.x, drag_start_.y, dx, dy);

    on_dragging();
  };

  self.on_double_click = function(mp)
  {
    var i = self.find_item(mp);
    
    if (i != -1)
      self.on_item_double_click.fire(items_[i]);

    return true;
  }

  self.on_keydown = function(code)
  {
    switch(code)
    {
      case ui.key_codes.up:
      {
        if (focus_ > 0)
        {
          if (pivot_ == -1)
            pivot_ = focus_;

          handle_keyboard_selection(focus_ - 1);
        }
        break;
      }

      case ui.key_codes.down:
      {
        if (focus_ < (items_.length - 1))
        {
          if (pivot_ == -1)
            pivot_ = focus_;

          handle_keyboard_selection(focus_ + 1);
        }

        break;
      }
      
      case ui.key_codes.page_up:
      {
        var vi = visible_items(true);
        var c = vi.last - vi.first;

        var f = vi.first;
        if (focus_ == vi.first)
          f = vi.first - c;
        
        f = clamp(f, 0, items_.length - 1);

        handle_keyboard_selection(f);
        break;
      }

      case ui.key_codes.page_down:
      {
        var vi = visible_items(true);
        var c = vi.last - vi.first;

        var f = vi.last;
        if (focus_ == vi.last)
          f = vi.last + c;
        
        f = clamp(f, 0, items_.length - 1);

        handle_keyboard_selection(f);
        break;
      }
      
      case " ".charCodeAt(0):
      {
        var rp = self.get_root_panel();

        if (rp.key_state(ui.key_codes.ctrl))
        {
          if (rp.key_state(ui.key_codes.shift))
            self.select(range(pivot_, focus_));
          else
            self.select_reverse([focus_]);

          pivot_ = focus_;
        }
        else
        {
          self.select([focus_]);
        }

        break;
      }
    }

    return true;
  };

  var handle_click_selection = function(i)
  {
    var sel = [];
    var rp = self.get_root_panel();

    if (rp.key_state(ui.key_codes.shift) && focus_ != -1 &&
        self.option("multiple"))
    {
      var a = focus_;
      var b = i;

      if (a > b)
      {
        var temp = a;
        a = b;
        b = temp;
      }

      if (a != -1 && b != -1)
      {
        for (var x=a; x<=b; ++x)
          sel.push(x);
      }
    }
    else
    {
      if (i != -1)
        sel = [i];
    }

    handle_mouse_selection(sel, true);
  }

  var handle_keyboard_selection = function(sel)
  {
    var rp = self.get_root_panel();

    if (!self.option("multiple"))
    {
      if (sel == -1)
      {
        self.select_only([]);
      }
      else
      {
        self.select_only([sel]);
        self.focus_item(sel);
      }

      pivot_ = -1;
    }
    else
    {
      //todo: ??
      if (sel.length == 0)
        return;

      if (rp.key_state(ui.key_codes.shift) && rp.key_state(ui.key_codes.ctrl))
      {
        self.select(range(pivot_, sel));
        self.focus_item(sel);
        pivot_ = sel;        
      }
      else if (rp.key_state(ui.key_codes.shift))
      {
        self.select_only(range(pivot_, sel));
        self.focus_item(sel);
      }
      else if (rp.key_state(ui.key_codes.ctrl))
      {
        self.focus_item(sel);
      }
      else
      {
        self.select_only([sel]);
        self.focus_item(sel);

        pivot_ = -1;
      }
    }
  }

  var handle_mouse_selection = function(sel, ctrl_reverses)
  {
    var rp = self.get_root_panel();

    if (!self.option("multiple"))
    {
      if (sel.length == 0)
      {
        self.select_only([]);
      }
      else
      {
        self.select_only([sel[0]]);
        self.focus_item(sel[0]);
      }
    }
    else
    {
      if (rp.key_state(ui.key_codes.ctrl) || rp.key_state(ui.key_codes.shift))
      {
        if (sel.length == 0)
          return;
      }

      if ((rp.key_state(ui.key_codes.ctrl) && rp.key_state(ui.key_codes.shift)))
      {
        self.select(sel);
      }
      else if (!ctrl_reverses && (rp.key_state(ui.key_codes.ctrl) || rp.key_state(ui.key_codes.shift)))
      {
        self.select(sel);
      }
      else if (rp.key_state(ui.key_codes.ctrl))
      {
        self.select_reverse(sel);

        if (sel.length > 0)
          self.focus_item(sel[0]);
      }
      else if (rp.key_state(ui.key_codes.shift))
      {
        self.select_only(sel);
      }
      else
      {
        self.select_only(sel);

        if (sel.length != 0)
          self.focus_item(sel[0]);
      }
    }

    self.redraw();
  }

  // returns the specific part of the list that's under the given
  // point, relative to this control:
  //
  //   {
  //     item: the index of the item, -1 if none; this is set even if
  //           the cursor is outside the item but aligned with it
  // 
  //     column: the index of the column, -1 if none; this is set
  //             even if the cursor is not over an item
  //
  //     part: a combination of list_parts values
  //  }
  //  
  self.hit_test = function(p)
  {
    assert(p != undefined && p.internal_is_a_point);

    var ht = {item: -1, column: -1, part: 0};
    var rp = new point(p.x, p.y);

    // skip the header
    if (self.option("show_header"))
      rp.y -= header_.height();

    // scrolling
    rp.x -= origin_.x;
    rp.y -= origin_.y;

    var i = to_int(rp.y / self.option("item_height"));
    if (i >= 0 && i < items_.length)
    {
      ht.item = i;
    }
    else
    {
      if (i < 0)
        ht.part |= ui.list_parts.above;
      else
        ht.part |= ui.list_parts.below;
    }

    var cx = 0;
    for (var c=0; c<cols_.length; ++c)
    {
      var cr = new rectangle(
        cx, i * self.option("item_height"),
        cols_[c].width(), self.option("item_height"));

      if (rp.x < (cr.x + cr.w))
      {
        var crp = new point(rp.x - cr.x, rp.y - cr.y);
        ht.column = c;

        if (c == 0 && crp.x < self.option("padding"))
        {
          ht.part |= ui.list_parts.before;
        }
        else
        {
          crp.x -= self.option("padding");

          if (crp.x < self.option("padding"))
          {
            ht.part |= ui.list_parts.nowhere;
          }
          else if (ht.item >= 0)
          {
            crp.x -= self.option("padding");

            var cw = text_dimension(items_[i].caption(c), self.font()).w;
            if (crp.x < cw)
            {
              ht.part |= ui.list_parts.caption;
            }
            else
            {
              ht.part |= ui.list_parts.nowhere;
            }
          }
        }

        break;
      }

      cx += cr.w;
    }

    if (ht.column == -1)
      ht.part |= ui.list_parts.after;

    return ht;
  }

  // returns the index of the given item or -1
  //
  var item_index = function(item)
  {
    for (var i=0; i<items_.length; ++i)
    {
      if (items_[i] == item)
        return i;
    }

    return -1;
  }

  // returns the index of the item at the given point (relative to
  // this control) or -1
  //
  self.find_item = function(p)
  {
    assert(p != undefined && p.internal_is_a_point);

    var ht = self.hit_test(p);
    assert(ht.item != undefined);

    if (ht.part & ui.list_parts.on_item)
      return ht.item;

    return -1;
  };

  // returns the index of the column at the given point (relative to
  // this control) or -1
  //
  var find_column = function(p)
  {
    assert(p != undefined && p.internal_is_a_point);

    var ht = self.hit_test(p);
    if (ht.part != "")
      return ht.column;
  }
  
  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "list";
  };

  init();
}

});   // namespace ui
