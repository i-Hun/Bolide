// minimongo collections
Posts = new Meteor.Collection("posts");

//permissions
Posts.allow({
	insert: function(userId, post) {
		// the user must be logged in, and the document must be owned by the user
    	if(userId) {
    		return true;
    	} else return false;
	},
	update: function(userId, post, fields, modifier) {
		return post.owner._id === userId;
	},
	remove: function(userId, post) {
		return post.owner._id === userId;
	}
});

// Posts.deny({
// 	update: function(userId, post, fields, modifier) {
// 		return _.contains(fields, 'owner');
// 	},
// });