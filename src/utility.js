// $Id$

namespace("ui", {

// control key values
key_codes:
{
  left: 37, up: 38, right: 39, down: 40,
  home: 36, end: 35, back: 8, del: 46,
  shift: 16, ctrl: 17, alt: 18
},

// represents a font, can be used to construct css strings
//
font: function(name, size, i, b)
{
  var self = this;

  // for sanity checks
  self.internal_is_a_font = true;


  assert(name != undefined && name !== "");
  assert(size != undefined && size !== "");
  
  // font family
  var name_ = name;

  // size
  var size_ = size;

  // italic/bold
  var opts_ = {
    "italic": (i === true ? true : false),
    "bold": (b === true ? true : false)};
  
  // returns something like "italic 12pt arial", valid for context.font
  // 
  self.string = function()
  {
    var s = "";
    
    if (opts_.italic)
      s += "italic ";
    
    if (opts_.bold)
      s += "bold ";
    
    s += size_ + " " + name_;
    
    return s;
  };
  
  // makes this font italic
  //
  self.italic = function()
  {
    opts_.italic = true;
    return self;
  };
  
  // makes this font bold
  //
  self.bold = function()
  {
    opts_.bold = true;
    return self;
  };

  self.clone = function()
  {
    return new ui.font(name_, size_, opts_.italic, opts_.bold);
  }
},


// color theme
// todo, not everything is in here
theme:
{
  default_font: function()
  {
    return new ui.font("sans-serif", "11pt", false, false);
  },

  face_color: function()
  {
    return new color(0.82, 0.81, 0.78);
  },

  hovered_face_color: function()
  {
    return new color(0.84, 0.83, 0.80);
  },

  panel_color: function()
  {
    return new color(0.82, 0.81, 0.78);
  },

  page_scroll_color: function()
  {
    return new color(0.25, 0.25, 0.25);
  },

  text_color: function()
  {
    return new color().black();
  },

  selected_text_color: function()
  {
    return new color().white();
  },

  selected_text_background: function()
  {
    return new color(0.03, 0.14, 0.41);
  },

  disabled_text_color: function()
  {
    return new color(0.5, 0.5, 0.5);
  },
  
  tooltip_color: function()
  {
    return new color(1.0, 1.0, 0.85);
  }
},

// system wide options
//
system_options:
{
  scroll_delay: 300,
  scroll_tick_delay: 50
}

});   // namespace ui

// returns a function that will call f() with the given arguments
// any argument can be left out
//
function bind(f, a1, a2, a3, a4, a5)
{
  return function()
    {
      return f(a1, a2, a3, a4, a5);
    };
}

// returns a function that will call f.o() with any arguments it
// receives
//
function mem_fun(f, o)
{
  return function(a1, a2, a3, a4, a5)
    {
      assert(o && o[f]);
      return o[f](a1, a2, a3, a4, a5);
    };
}

// breaks into the debugger when 'b' is false
//
function assert(b)
{
  if (!b)
    debugger;
}

// returns whether array 'a' contains the value 'v'
//
function contains(a, v)
{
  for (var i in a)
  {
    if (a.hasOwnProperty(i))
    {
      if (a[i] == v)
        return true;
    }
  }

  return false;
}

// returns the number of elements in the array/object
//
function array_length(a)
{
  var c = 0;
  for (var i in a)
    ++c;

  return c;
}

// splits string 's' at all 'sep', discarding the separator and
// returning the parts in an array
//
function explode(s, sep)
{
  assert(s != undefined);
  assert(sep != undefined);
  assert(s.indexOf != undefined);
  
  var last = 0;
  var n = 0;
  
  var r = new Array();
  for (;;)
  {
    n = s.indexOf(sep, last);
    if (n == -1)
    {
      r.push(s.substring(last));
      break;
    }
    
    r.push(s.substring(last, n));
    last = n + 1;
  }
  
  return r;
}

// where o and values are arrays, sets the elements in 'o' if the
// index from 'values' does not exist
//
function set_default(o, values)
{
  assert(o != undefined);
  assert(values != undefined);

  for (var i in values)
  {
    if (o[i] == undefined)
      o[i] = values[i];
  }
}

// returns the mouse position relative to the target of the event
//
function mouse_pos(ev)
{
  var cv = ev.currentTarget;

  var x = document.body.scrollLeft + ev.clientX;
  var y = document.body.scrollTop + ev.clientY;
  
  var node = cv;
  while (node)
  {
    if (node.offsetLeft != undefined && node.offsetTop != undefined)
    {
      x -= node.offsetLeft;
      y -= node.offsetTop;
    }
    
    node = node.offsetParent;
  }
  
  return new point(x, y);
}

// replaces placeholders such as {0}
//
String.prototype.format = function()
{
  // http://stackoverflow.com/questions/610406/
  //   javascript-printf-string-format
  
  var formatted = this;
  for (var i = 0; i < arguments.length; i++)
  {
    var regexp = new RegExp('\\{'+i+'\\}', 'gi');
    formatted = formatted.replace(regexp, arguments[i]);
  }
  
  return formatted;
};

// returns a string of all the array elements
//
function dump_array(a)
{
  if (!a || a.length === 0)
    return "";

  var opts = "";
  for (var n in a)
  {
    if (opts.length > 0)
      opts += ", ";
    
    opts += n + ": " + a[n];
  }
  
  return "{" + opts + "}";
}

// does a deep copy of the given object
//
function clone(b)
{
  return $.extend(true, {}, b);
}

// list of callbacks; if a callback return false, it will be removed
// from the list
//
function signal()
{
  // sanity checks
  this.internal_is_a_signal = true;

  var self = this;

  // the callbacks
  var fs_ = [];
  

  // adds a new callback
  //
  self.add = function(f)
  {
    fs_.push(f);
  };

  // removes the given callback
  //
  self.remove = function(f)
  {
    for (var i in fs_)
    {
      if (fs_[i] == f)
      {
        fs_.splice(i, 1);
        break;
      }
    }
  };
  
  // fires this signal with the given arguments
  //
  self.fire = function(a1, a2, a3, a4, a5)
  {
    var keep = [];

    for (var i in fs_)
    {
      if (fs_[i](a1, a2, a3, a4, a5) !== false)
        keep.push(fs_[i]);
    }

    fs_ = keep;
  };
}

// formats 'f' so that there are at least two digits on the left side
// (padded with 0 on the left) and 'p' digits on the right side
// (padded with 0 on the right)
//
function format_float(f, p)
{
  var i = to_int(f);
  var d = to_int((f - i) * Math.pow(10, p));
  
  return pad_left(i, 2, "0") + "." + pad_right(d, p, "0");
}

// adds enough 'c' characters to the right of 'v' so that 'v' has 's'
// characters
//
function pad_right(v, s, c)
{
  v = "" + v;
  
  if (c == undefined)
    c = " ";
  
  while (v.length < s)
    v += c;
  
  return v;
}

// adds enough 'c' characters to the left of 'v' so that 'v' has 's'
// characters
//
function pad_left(v, s, c)
{
  v = "" + v;
  
  if (c == undefined)
    c = " ";
  
  while (v.length < s)
    v = c + v;
  
  return v;
}

// freezes the given object; this is to wrap browsers that don't
// support it
//
function make_const(o)
{
  if (Object.freeze)
    return Object.freeze(o);
  return o;
}

// 'values' is an array of strings corresponding to the names in the
// enum; this returns a frozen object with the strings as indices and
// increasing numbers from 0
//
function make_enum(values)
{
  var r = new Array();
  
  var i=0;
  for (var v in values)
  {
    r[values[v]] = i;
    ++i;
  }

  return make_const(r);
}

// returns 'v' as an integer, assumes base 10
//
function to_int(v)
{
  return parseInt(v, 10);
}

// returns whether 'v' is a number (todo: more)
//
function is_number(v)
{
  if (isNaN(Number(v)))
    return false;
  return true;
}

// returns whether 'r' is one of the elements in vs
//
function one_of(r, vs)
{
  for (var v in vs)
  {
    if (r === vs[v])
      return true;
  }

  return false;
}

function valid_bounds(r)
{
  assert(r != undefined);

  // checking if 'r' makes some sense
  
  if (r.x == undefined || isNaN(r.x))
    return false;

  if (r.y == undefined || isNaN(r.y))
    return false;

  if (r.w == undefined || isNaN(r.w))
    return false;

  if (r.h == undefined || isNaN(r.h))
    return false;
  
  return true;
}

function valid_dimension(d)
{
  assert(d != undefined);

  // checking if 'd' makes some sense
  if (d.w == undefined || isNaN(d.w))
    return false;

  if (d.h == undefined || isNaN(d.h))
    return false;

  return true;
}

function clamp(v, a, b)
{
  if (v < a)
    return a;
  else if (v > b)
    return b;

  return v;
}

// returns whether 'c' is one of space, \t, \n, \v, \f or \r
//
function isspace(c)
{
  var ws = " \t\n\v\f\r";
  if (ws.indexOf(c) != -1)
    return true;

  return false;
}

// returns the index of the next or previous word in 's' from 'from'.
// whitespace is ignored. if the adjacent word does not exist, 0 is
// returns for !forward and s.length+1 is returns for forward==true
//   
// options:
// keep_whitespace (true/false), default: false
//   treats whitespaces as any other separator
//
function adjacent_word(s, from, forward, opts)
{
  assert(s != undefined);
  assert(from >= 0 && from <= s.length);
  assert(forward === true || forward === false);

  if (opts == undefined)
    opts = [];

  set_default(opts, {keep_whitespace: false});

  if (forward && (from >= (s.length - 1)))
    return s.length;
  else if (!forward && from <= 0)
    return 0;

  var seps = "`~!@#$%^&*()-=+[{]}\\|;:'\",<.>/?";

  var i = from;
  var skip_spaces = false;
  var take_next_non_ws = false;
  var take_next_non_sep = false;

  if (!opts.keep_whitespace)
  {
    if (forward)
    {
      // currently on a whitespace, take the next non-whitespace
      if (isspace(s[from]))
        take_next_non_sep = true;
    }
    else
    {
      // currently on a whitespace or the previous character is a
      // whitespace; ignore all the previous whitespaces so the search
      // starts at the first non-whitespace
      if (isspace(s[from]) || isspace(s[from-1]))
        skip_spaces = true;
    }
  }

  // currently on a separator, the next non-whitespace character will
  // be taken
  if (seps.indexOf(s[i]) != -1)
    take_next_non_sep = true;

  for (;;)
  {
    if (forward)
      ++i;
    else
      --i;

    if (forward && (i >= (s.length - 1)))
      break;
    else if (!forward && i <= 0)
      break;
     
    // skip adjacent characters that are the same
    if (s[i] == s[i-1])
      continue;

    if (forward)
    {
      if (!opts.keep_whitespace && isspace(s[i]))
      {
        // currently on a whitespace, take the first non-whitespace
        // unles whitespaces are treated as separators
        take_next_non_ws = true;
        continue;
      }

      // was waiting for a non-whitespace, take it
      if (take_next_non_ws && !isspace(s[i]))
        return i;

      // separator, take it
      if (seps.indexOf(s[i]) != -1)
        return i;

      // take it if whitespace should be treated as separators
      if (opts.keep_whitespace && isspace(s[i]))
        return i;

      // starting character was a separator, take the first non-sep;
      // this is not collapsing the separators since if the current
      // character _is_ a separator, it was handled before this; this
      // is also not taking whitespaces since they were also handled
      // before
      if (take_next_non_sep)
        return i;
    }
    else
    {
      // if the starting character was a whitespace or was preceeded
      // by a whitespace, the next stopper will be either a whitespace
      // after encoutering a non-whitespace, or a separator
      // 
      if (skip_spaces)
      {
        if (isspace(s[i]))
        {
          // skip all whitespaces until a non-whitespace
          continue;
        }
        else
        {
          // done skipping, a non-whitespace was found
          skip_spaces = false;
        }
      }

      // here, this character is a non-whitespace and the next stopper
      // will be either a whitespace or a separator

      // separator, take it
      if (seps.indexOf(s[i-1]) != -1)
        return i;
      
      // whitespace, take it
      if (isspace(s[i-1]))
        return i;
    }
  }

  // hit either the beginning or the end of the string
  if (forward)
    return s.length + 1;
  else
    return 0;
}


// returns the canvas context object (todo: this is needed by graphics
// when measuring text, can't it be avoided?)
//
function get_context()
{
  return document.getElementById("canvas").getContext("2d");
}


// this will first wait for start_delay, fire the handler and then
// start another timer for tick_delay that will continuously call the
// handler until stop() is called
//
function delayed_ticker(start_delay, tick_delay)
{
  var self = this;

  // long timer
  var start_tick_timer_ = undefined;

  // short timer
  var tick_timer_ = undefined;
  
  // long timer delay
  var start_delay_ = start_delay;

  // short timer delay
  var tick_delay_ = tick_delay;

  // handler
  var fun_ = undefined;


  // starts the long timer and sets the handler; this assumes the
  // ticker is not running
  //
  self.start = function(fun)
  {
    assert(fun_ == undefined);
    assert(fun != undefined);
    fun_ = fun;

    start_tick_timer_ = setTimeout(on_start_tick, start_delay_);
  };
  
  // calls fun() immediately and starts the short timer; this assumes
  // the ticker is not running
  //
  self.start_no_delay = function(fun)
  {
    assert(fun_ == undefined);
    assert(fun != undefined);
    fun_ = fun;

    fire();
  }

  // stops the timer (whether long or short); noop if not started
  //
  self.stop = function()
  {
    fun_ = undefined;

    if (tick_timer_ != undefined)
    {
      clearInterval(tick_timer_);
      tick_timer_ = undefined;
    }

    if (start_tick_timer_ != undefined)
    {
      clearTimeout(start_tick_timer_);
      start_tick_timer_ = undefined;
    }
  };

  // fires the handler and starts the short timer (if needed, and if
  // the handler didn't stop it)
  //
  var fire = function()
  {
    fun_();

    if (tick_timer_ == undefined)
    {
      // start the short timer

      // this may happen if the handler stopped the ticker
      if (fun_ != undefined)
        tick_timer_ = setInterval(on_tick, tick_delay_);
    }
  }

  // called when the long timer fires
  //
  var on_start_tick = function(v)
  {
    assert(fun_);

    start_tick_timer_ = undefined;
    fire();
  };

  // called when the short timer fires
  //
  var on_tick = function(v)
  {
    assert(fun_ != undefined);
    fire();
  };
}


var g_image_dir = "images";

function image_dir()
{
  return g_image_dir;
}

function set_image_dir(d)
{
  g_image_dir = d;
}
