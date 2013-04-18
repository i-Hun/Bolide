// Sesssions variables
//// newPost
Session.setDefault("newPost", null);

//// Name of currently selected tag for filtering
Session.setDefault('tag_filter', null);

//// When adding tag to a post, ID of the post
Session.setDefault('editing_addtag', null);

Session.setDefault("editable_post", null);

//Golbal
// postCreated
// postCreatedUpd

// Subscriptions
var postsHandle = Meteor.subscribe("posts", function () {

});

//helpers
var activateInput = function (input) {
  input.focus();
  input.select();
};

//// Returns an event map that handles the "escape" and "return" keys and
//// "blur" events on a text input (given by selector) and interprets them
//// as "ok" or "cancel".
var okCancelEvents = function (selector, callbacks) {
  var ok = callbacks.ok || function () {};
  var cancel = callbacks.cancel || function () {};

  var events = {};
  events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
    function (evt) {
      if (evt.type === "keydown" && evt.which === 27) {
        // escape = cancel
        cancel.call(this, evt);

      } else if (evt.type === "keyup" && evt.which === 13 ||
                 evt.type === "focusout") {
        // blur/return/enter = ok/submit if non-empty
        var value = String(evt.target.value || "");
        if (value)
          ok.call(this, value, evt);
        else
          cancel.call(this, evt);
      }
    };

  return events;
};

// body template

Template.body.newPost  = function () {
  return Session.get("newPost");
}

// topBar template
Template.body.rendered = function () {
  Meteor.setTimeout(function() {
    $(document).foundation();
  }, 0)
}


Template.topBar.events({
  "click #create-post": function () {
    if(Session.get("newPost")) {
      Session.set("newPost", false);
    } else {
      Session.set("newPost", true);
    }
    
  }
});

// newPost template
Template.newPost.rendered = function () {
  $("#date-area").pickadate({
    firstDay: 1,
    format: 'dd mmmm yyyy',
    formatSubmit: 'yyyy-mm-dd',    
    onSelect: function() {
      postCreated = this.getDate("yyyy-mm-dd");
    },
  });

  var tagsArr = [];
  Posts.find().forEach(function (post) {
    _.each(post.tags, function (tag) {
      tagsArr.push(tag);
    });    
  });

  $("#add-new-tags").select2({
    placeholder: "Введите ключевые слова",
    tags: tagsArr,
    tokenSeparators: [",", " "],
    maximumInputLength: 10,
  });

}

Template.newPost.events({
  "click #submit-post": function(evt, tmpl) {
    Posts.insert({
      owner: Meteor.user(),
      title: $("#title-area").val(),
      text: $("#editor-area").val(),
      date: postCreated,
      tags: $("#add-new-tags").select2("val")
    });
    
    $("#title-area").val("");
    $("#editor-area").val("");

    Session.set("newPost", null);

  }
});

// post template
//// handlebars helpers style

//// Handlebars.registerHelper("formatDate", function(date) {
////   return new Handlebars.SafeString(
////     moment(date).format('LL')
////   );
//// });

//// meteor helpers style
Template.post.helpers({
  formatDate: function (date) {
    return moment(date).format('LL');
  }
});

Template.post.tag_objs = function () {
  var post_id = this._id;
  return _.map(this.tags || [], function (tag) {
    return {post_id: post_id, tag: tag};
  });
}

Template.post.events({
  "click .rm-post": function(evt, tmpl) {
    Posts.remove(this._id);
  },
  "click .post-edit": function() {
    var postDate = this.date;
    var postDateArr = postDate.split("-");

    Session.set("editable_post", this._id);
    Meteor.setTimeout(function() {
      $("#post-date-update").pickadate({
        firstDay: 1,
        format: 'dd mmmm yyyy',
        formatSubmit: 'yyyy-mm-dd',    
        onSelect: function() {
          postCreatedUpd = this.getDate("yyyy-mm-dd");
        },
      }).data('pickadate').setDate(postDateArr[0], postDateArr[1], postDateArr[2]);
    }, 0)
    
  },
  "click .post-submit-changes": function(evt, tmpl) {
    Posts.update({_id: this._id}, {$set: {
        title: $(tmpl.find(".post-title")).html(),
        text: $(tmpl.find(".article-content")).html(),
        date: postCreatedUpd
      }
      
    });
    Session.set("editable_post", null);
  },
  "click .addtag": function(evt, tmpl) {
    Session.set("editing_addtag", this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#edittag-input"));
  },
  "click .rm-tag": function() {
    var tag = this.tag;
    var id = this.post_id;
    Posts.update({_id: id}, {$pull: {tags: tag}})
  }
});

Template.post.events(okCancelEvents(
  '#edittag-input',
  {
    ok: function (value) {
      Posts.update(this._id, {$addToSet: {tags: value}});
      Session.set('editing_addtag', null);
    },
    cancel: function () {
      Session.set('editing_addtag', null);
    }
  }));

Template.post.adding_tag = function() {
  return Session.equals("editing_addtag", this._id)
};

Template.post.contenteditable = function() {
  return Session.equals("editable_post", this._id) ? "contenteditable" : "";
};
//stream template
Template.stream.loading = function () {
  return !postsHandle.ready();
};

Template.stream.posts   = function () {
  var tag_filter = Session.get('tag_filter');
  if (tag_filter) {
    return Posts.find({tags: tag_filter}, {sort: {date: -1}});
  } else {
    return Posts.find({}, {sort: {date: -1}});
  }
  
};

Template.stream.count   = function () {
  return Posts.find().count();
};

//tag_filter template
Template.tag_filter.tags = function () {
  var tag_infos = [];
  var total_count = 0;

  Posts.find().forEach(function (post) {
    _.each(post.tags, function (tag) {
      var tag_info = _.find(tag_infos, function (x) { return x.tag === tag; });
      if (! tag_info)
        tag_infos.push({tag: tag, count: 1});
      else
        tag_info.count++;
    });
    total_count++;
  });

  tag_infos = _.sortBy(tag_infos, function (x) { return x.tag; });
  tag_infos.unshift({tag: null, count: total_count});

  return tag_infos;
};

Template.tag_filter.tag_text = function () {
  return this.tag || "All posts";
};

Template.tag_filter.selected = function () {
  return Session.equals('tag_filter', this.tag) ? 'selected' : '';
};

Template.tag_filter.events({
  'mousedown .tag': function () {
    if (Session.equals('tag_filter', this.tag))
      Session.set('tag_filter', null);
    else
      Session.set('tag_filter', this.tag);
  }
});
// buttonBar template
Template.buttonBar.events({
  "click li.bold": function() {
    document.execCommand( 'bold', false, null ); 
  },
  "click li.italic": function() {
    document.execCommand('italic', false, null ); 
  },
  "click li.underline": function() {
    document.execCommand('underline', false, null ); 
  },
  "click li.strike": function() {
    document.execCommand('strikethrough', false, null ); 
  },
  "click li.JustifyLeft": function() {
    document.execCommand('JustifyLeft', false, null ); 
  },
  "click li.JustifyCenter": function() {
    document.execCommand('JustifyCenter', false, null ); 
  },
  "click li.JustifyRight": function() {
    document.execCommand('JustifyRight', false, null ); 
  },
  "click li.JustifyFull": function() {
    document.execCommand('JustifyFull', false, null ); 
  },
  "click li.CreateLink": function() {
    document.execCommand('CreateLink', false, window.prompt( 'URL:', '' ) ); 
  },
  "click li.Unlink": function() {
    document.execCommand('Unlink', false, null ); 
  },
});

// Profile

  // var frag = Meteor.renderList(
  // Meteor.users.find(),
  // function(user) {
  //   return '<div>' + user.emails[0].address + '</div>';
  // });
  // $("#my-profile").append(frag);
Template.profile.me = function() {
  return Meteor.users.find();
};
