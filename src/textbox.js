// $Id$

namespace("ui",
{

// control for text entry
//
// this emulates double clicks because it acts on the second left
// button down, not up (so word selection can take place)
//
textbox: function(t, opts)
{
  ui.inherit_control(this, opts);
  var self = this;

  // caret timer
  var caret_timer_ = undefined;

  // if true, caret is drawn; changed in timer
  var caret_ = false;

  // selection
  var sel_ = {first: 0, last: 0};

  // true when the left mouse button is down once but not released;
  // this will select characters on mouse moves
  var selecting_char_ = false;

  // true when the left mouse button is down twice quickly but not
  // released on the second time; this will select words on mouse
  // moves
  var selecting_word_ = false;

  // selection right after the word selection starts; the mouse over
  // behaviour is different over the original word
  var original_word_ = undefined;

  // last time the left mouse button was down; this is used for the
  // double click
  var last_left_down_time_ = 0;

  // last position of the left button down event
  var last_left_down_ = new point(0, 0);

  // number of clicks that are between the double click delay; this
  // allows for triple clicks
  var click_count_ = 0;

  // delay between two left down for a double click
  // todo: ugh, can't we get the system specific delay?
  var double_click_delay_ = 300;

  // maximum distance in pixels between two clicks for a double click
  var double_click_distance_ = 4;

  // text buffer
  var text_ = "";


  var init = function(t)
  {
    self.set_default_options({
      "margin": 2,
      "text_color": ui.theme.text_color(),
      "selected_text_color": ui.theme.selected_text_color(),
      "selected_text_background": ui.theme.selected_text_background(),
      "background": new color().white()
      });

    self.cursor("text");

    if (t != undefined)
      self.text(t);
  };

  // todo
  //
  self.best_dimension = function()
  {
    return new dimension(180, g_line_height + self.option("margin")*2);
  };


  self.draw = function(context)
  {
    fill_rect(context, self.option("background"), self.bounds());
    outline_rect(context, new color().black(), self.bounds());

    // top-left of the string
    var p = new point(self.position().x + self.option("margin"), text_y());

    draw_caret(context);

    if (sel_.first == sel_.last)
    {
      draw_text(
        context, text_, new color().black(),
        new rectangle(
          p.x, p.y, self.width() - self.option("margin")*2, g_line_height),
      self.font()); 
    }
    else
    {
      var s = normalized_selection();

      var t1 = text_.substring(0, s.first);
      var t2 = text_.substring(s.first, s.last);
      var t3 = text_.substring(s.last);

      var w1 = text_dimension(t1, self.font()).w;
      var w2 = text_dimension(t2, self.font()).w;

      var p1 = p;
      var p2 = new point(p1.x + w1, p1.y);
      var p3 = new point(p2.x + w2, p1.y);

      draw_text(
        context, t1, self.option("text_color"),
        new rectangle(
          p1.x, p1.y, self.width() - self.option("margin")*2, g_line_height),
      self.font()); 
      
      fill_rect(context, self.option("selected_text_background"),
        new rectangle(p2.x, p2.y, w2, g_line_height));

      draw_text(
        context, t2, self.option("selected_text_color"),
        new rectangle(
          p2.x, p2.y,
          self.width() - self.option("margin")*2 - w1, g_line_height),
      self.font()); 

      draw_text(
        context, t3, self.option("text_color"),
        new rectangle(
          p3.x, p3.y,
          self.width() - self.option("margin")*2 - w2 - w1, g_line_height),
      self.font()); 
    }
  };

  // returns the y position of the top of the string (where the caret
  // also is)
  //
  var text_y = function()
  {
    return self.position().y + self.height()/2 - g_line_height/2;
  };

  // draws the caret if the control has focus and the caret tick is
  // on (changes on and off in a timer); the caret is always past the
  // last character of the selection
  //
  var draw_caret = function(context)
  {
    if (!self.is_focused() || !caret_)
      return;

    var td = text_dimension(
      text_.substring(0, sel_.last), self.font());

    var p = new point(
      self.position().x + td.w + self.option("margin"), text_y());

    draw_line(context, new color().black(), new rectangle(
      p.x, p.y, 1, g_line_height));
  }

  // selects the given range (clamped to [0, text().length]); if
  // last is undefined or the same as first, this sets the caret to
  // the given position. note that the caret will always be at
  // 'last', even if it is lower than 'first'
  //
  self.selection = function(first, last)
  {
    assert(first != undefined);

    if (last == undefined)
      last = first;

    first = clamp(first, 0, text_.length);
    last = clamp(last, 0, text_.length);

    if (first != sel_.first || last != sel_.last)
    {
      sel_.first = first;
      sel_.last = last;
    }

    show_caret();
    self.redraw();
  };

  // selects all the characters; the caret is put at the beginning
  //
  self.select_all = function()
  {
    self.selection(text_.length, 0);
  }

  // returns the selection where 'first' is always lower than 'last'
  //
  var normalized_selection = function()
  {
    if (sel_.first < sel_.last)
      return {first: sel_.first, last: sel_.last};
    else
      return {first: sel_.last, last: sel_.first};
  }

  // replaces the selection with the given text; if there is no
  // selection, inserts the given text at the caret position. this
  // leaves the caret at its lowest position
  //
  self.replace_selection = function(t)
  {
    var s = normalized_selection();
    self.text(
      text_.substring(0, s.first) + t + text_.substring(s.last));

    self.selection(s.first);
  }

  // if 's' is not undefined, sets the text in the textbox; in any
  // case returns the current text
  //
  self.text = function(s)
  {
    if (s != undefined)
    {
      if (text_ != s)
      {
        text_ = "" + s;

        // reclamp selection
        self.selection(sel_.first, sel_.second);

        self.redraw();
      }
    }

    return text_;
  }

  // appends the given text
  //
  self.append = function(s)
  {
    assert(s != undefined);
    self.text(text_ + s);
  }

  // returns the index of the start of the word under the caret; if
  // the caret is preceeded by a space, returns the index of the
  // previous word
  //
  self.previous_word = function()
  {
    var itor = new word_iterator(self.text_);
    var count = 0;
    var last_count = 0;

    while (itor.next())
    {
      var w = itor.word();

      if (sel_.first == count)
        return last_count;
      else if (sel_.first >= count && sel_.first < (count + w.length))
        return count;

      last_count = count;
      count += w.length;
    }

    return last_count;
  }

  // returns the index of the start of the previous word from the
  // caret
  //
  self.previous_word = function()
  {
    return adjacent_word(text_, sel_.last, false);
  }

  // returns the index of the start of the next word from the caret
  //
  self.next_word = function()
  {
    return adjacent_word(text_, sel_.last, true);
  }

  // called when a key is down while the textbox has focus
  //
  self.on_keydown = function(code)
  {
    var rp = self.get_root_panel();

    switch (code)
    {
      case ui.key_codes.left:
      {
        if (rp.key_state(ui.key_codes.ctrl))
        {
          var p = self.previous_word();

          if (rp.key_state(ui.key_codes.shift))
            self.selection(sel_.first, p);
          else
            self.selection(p);
        }
        else
        {
          if (rp.key_state(ui.key_codes.shift))
          {
            self.selection(sel_.first, sel_.last - 1);
          }
          else
          {
            if (sel_.first == sel_.last)
              self.selection(sel_.first-1);
            else
              self.selection(Math.min(sel_.first, sel_.last));
          }
        }

        return true;
      }

      case ui.key_codes.right:
      {
        if (rp.key_state(ui.key_codes.ctrl))
        {
          var p = self.next_word();

          if (rp.key_state(ui.key_codes.shift))
            self.selection(sel_.first, p);
          else
            self.selection(p);
        }
        else
        {
          if (rp.key_state(ui.key_codes.shift))
          {
            self.selection(sel_.first, sel_.last + 1);
          }
          else
          {
            if (sel_.first == sel_.last)
              self.selection(sel_.first+1);
            else
              self.selection(Math.max(sel_.first, sel_.last));
          }
        }

        return true;
      }

      case ui.key_codes.home:
      {
        if (rp.key_state(ui.key_codes.shift))
          self.selection(sel_.first, 0);
        else
          self.selection(0);

        return true;
      }

      case ui.key_codes.end:
      {
        if (rp.key_state(ui.key_codes.shift))
          self.selection(sel_.first, text_.length);
        else
          self.selection(text_.length);

        return true;
      }

      case ui.key_codes.back:
      {
        var s = {first: sel_.first, last: sel_.last};

        if (s.first != s.last)
        {
          self.replace_selection("");
        }
        else if (sel_.first > 0)
        {
          self.text(
            text_.substr(0, s.first-1) + text_.substr(s.first));
          self.selection(s.first-1);
        }

        return true;
      }

      case ui.key_codes.del:
      {
        if (sel_.first != sel_.last)
        {
          self.replace_selection("");
        }
        else if (sel_.first < text_.length)
        {
          self.text(
            text_.substr(0, sel_.first) + text_.substr(sel_.first+1));
        }

        return true;
      }
    }

    return false;
  }

  // called when a key is pressed while the textbox has focus
  //
  self.on_keypress = function(code)
  {
    if (code == 0 || contains(ui.key_codes, code))
      return true;

    var rp = self.get_root_panel();
    var c = String.fromCharCode(code);

    switch (c)
    {
      case "a":   // fall-through
      case "A":
      {
        if (rp.key_state(ui.key_codes.ctrl))
        {
          self.select_all();
          return true;
        }

        break;
      }
    }

    if (rp.key_state(ui.key_codes.ctrl) || rp.key_state(ui.key_codes.alt))
    {
      // ignore anything else while ctrl or alt is down (or else
      // ctrl-c would insert a 'c')
      return true;
    }

    self.replace_selection(c);
    self.selection(sel_.first + 1);

    self.redraw();

    return true;
  }

  // moves the caret to the hovered character, starts the selection
  //
  self.on_mouse_left_down = function(mp)
  {
    self.control__on_mouse_left_down(mp);

    var now = new Date().getTime();

    var dx = mp.x - last_left_down_.x;
    var dy = mp.y - last_left_down_.y;
    var d = Math.sqrt(dx*dx + dy*dy);

    if (click_count_ == 0)
    {
      // first click in the series
      click_count_ = 1;
    }
    else
    {
      // if that click was fast and close enough, increase the click
      // count (but no more than 3); if not, reset the click count
      // so this is considered a single click
      if (now - last_left_down_time_ < double_click_delay_ &&
          d < double_click_distance_)
      {
        ++click_count_;
        if (click_count_ > 3)
          click_count_ = 1;
      }
      else
      {
        click_count_ = 1;
      }
    }

    if (click_count_ == 1)
    {
      // single click
      var i = self.index_from_point(mp);
      self.selection(i);
      
      start_char_selection();
    }
    else if (click_count_ == 2)
    {
      // double click
      select_word(mp);
      start_word_selection();
    }
    else if (click_count_ == 3)
    {
      // triple click
      self.select_all();
    }
     
    last_left_down_time_ = now;    
    last_left_down_ = mp;
  }

  // stops the selection
  //
  self.on_mouse_left_up = function(mp)
  {
    self.control__on_mouse_left_up(mp);

    if (selecting_char_)
      stop_char_selection();
    else if (selecting_word_)
      stop_word_selection();
  }

  // further mouse movements will select characters
  //
  var start_char_selection = function()
  {
    assert(selecting_char_ === false);
    assert(selecting_word_ === false);

    self.capture_mouse();
    selecting_char_ = true;
  }

  // stops the character selection
  //
  var stop_char_selection = function()
  {
    assert(selecting_char_ === true);
    assert(selecting_word_ === false);

    selecting_char_ = false;
    self.release_mouse();
  }

  // further mouse movements will select words
  //
  var start_word_selection = function()
  {
    assert(selecting_char_ === false);
    assert(selecting_word_ === false);

    self.capture_mouse();
    selecting_word_ = true;
    original_word_ = {first: sel_.first, last: sel_.last};
  }

  // stops the word selection
  //
  var stop_word_selection = function()
  {
    assert(selecting_char_ === false);
    assert(selecting_word_ === true);

    selecting_word_ = false;
    self.release_mouse();
  }
  
  // selects the word under the cursor
  //
  var select_word = function(mp)
  {
    var i = self.index_from_point(mp);

    // first and last
    var a=0, b=0;

    // first character: select until the end of that word
    if (i == 0)
    {
      a = 0;
      b = adjacent_word(text_, i, true, {keep_whitespace: true});
    }
    else
    {
      if (isspace(text_[i]) && !isspace(text_[i-1]))
      {
        // if the cursor is on a whitespace and the previous character
        // is a non-whitespace, select the previous word

        a = adjacent_word(text_, i, false);
        b = i;
      }
      else if (isspace(text_[i]) && isspace(text_[i-1]))
      {
        // if the cursor is on a whitespace and the previous character
        // is also a whitespace, select from the previous word to the
        // end of the next one
        
        // start of the previous word
        a = adjacent_word(text_, i, false);
        
        // start of the next word
        b = adjacent_word(text_, i, true);

        // end of the next word
        b = adjacent_word(text_, b, true, {keep_whitespace: true});
      }
      else
      {
        // middle of a non-whitespace, select that word
        a = adjacent_word(text_, i, false);
        b = adjacent_word(text_, i, true, {keep_whitespace: true});

        // if the cursor was actually at the beginning of the word,
        // select that word instead
        if (adjacent_word(text_, a, true) == i)
          a = i;
      }
    }

    self.selection(a, b);
  }

  // selects characters if the left button is down
  //
  self.on_mouse_move = function(mp)
  {
    self.control__on_mouse_move(mp);

    var i = self.index_from_point(mp);

    if (selecting_char_)
    {
      self.selection(sel_.first, i);
    }
    else if (selecting_word_)
    {
      var s = normalized_selection();

      if (i >= original_word_.first && i <= original_word_.last)
      {
        // the mouse over behaviour is different over the original
        // word: the caret goes on the first character of the word
        // when the mouse is over it; otherwise, the caret is always
        // at the end of the word
        if (s.first == i)
          self.selection(original_word_.last, original_word_.first);
        else
          self.selection(original_word_.first, original_word_.last);
      }
      else if (i < original_word_.first)
      {
        // select the beginning of the word from 'i'
        //
        // adjacent_word() will return the previous word if 'i' is
        // the first character of a word; word-selection is different,
        // insofar as the cursor needs to be over the character just
        // before a word to select the previous one; hence the i+1
        var a = adjacent_word(text_, i + 1, false);
        self.selection(sel_.first, a);
      }
      else if (i > original_word_.last)
      {
        // select to the end of the next word from 'i'
        var a = adjacent_word(text_, i, true, {keep_whitespace: true});
        self.selection(sel_.first, a);
      }
    }
  }

  // returns the index of the caracter under the given position (in
  // pixels, relative to this control); if the x position is before
  // any character, returns 0; if the x position is after the last
  // character, returns text().length
  //
  self.index_from_point = function(p)
  {
    assert(p != undefined && p.internal_is_a_point);

    if (text_.length == 0 || p.x <= self.option("margin"))
      return 0;

    var current = 0;

    for (var i=0; i<text_.length; ++i)
    {
      var s = text_dimension(text_[i], self.font()).w;
      
      if (p.x >= current && p.x < (current + s))
        return i;

      current += s;
    }

    return text_.length;
  }

  // resets the caret tick timer and redraws immediately with the
  // caret on
  //
  var show_caret = function()
  {
    hide_caret();

    caret_timer_ = setInterval(on_caret_timer, 500);
    caret_ = true;
    self.redraw();
  }

  // clears the caret tick timer and redraws immediately if the caret
  // was visible
  //
  var hide_caret = function()
  {
    if (caret_timer_ != undefined)
    {
      clearInterval(caret_timer_);
      caret_timer_ = undefined;
      self.redraw();
    }
  }
  
  // called when the textbox gets focus, shows the caret
  //
  self.on_focus = function(other)
  {
    show_caret();
  };

  // called when the textbox loses focus, hides the caret
  //
  self.on_blur = function(other)
  {
    hide_caret();
    self.selection(sel_.last);
  }

  // called when the caret tick timer fires, inverts the caret state
  // and redraws
  //
  var on_caret_timer = function()
  {
    caret_ = !caret_;
    self.redraw();
  }

  // debug: returns this control's name
  //
  self.typename = function()
  {
    return "textbox";
  }

  init(t);
}

});   // namespace ui
