$("div.page").hide();
var pod = crosscloud.connect();

/*
setTimeout(function () {
	var username = pod.getUserId().substring(7);
	$(".myUsername").text(username);
}, 500); //TODO: make this happen on connect */

function navigate(windowHash) {
	if (windowHash === "#profile") {
		//getMyUsername();
		getMySubscriptions();
		showPage("profile");
	} else if (windowHash.substring(0,6) === "#user/") {
		var username = windowHash.substring(6);
		getUserPage(username);
		showPage("user");
	} else if (windowHash.substring(0,7) === "#forum/") {
		var forumName = windowHash.substring(7);
		if (forumName.indexOf("/") === -1) {
			getForumPage(forumName);
			showPage("forum");
		} else {
			forumName = forumName.split("/");
			var threadID = forumName[1];
			forumName = forumName[0]; //TODO: This is confusing
			getThreadPage(forumName, threadID);
			showPage("thread");
		}
		
	} else {
		getMainPage();
		showPage("main");
	}
}

function showPage(pageID) {
	$("div.page").hide();
	$("div.page#"+pageID).show();
}

setTimeout(function(){
	navigate(window.location.hash); //There's gotta be a better way...
}, 500)


var currentForumURL;
function getForumPage(forumName) {
	$(".viewingForumName").text(forumName);
	currentForumURL = forumName;

	$.get("http://"+forumName+"/_active", function(res) {
		var response = JSON.parse(res);
		var members = response._members;
		if (members) {
			for (var i=0; i<members.length; i++) {
				var root = members[i];
				if (root.type === "post" && root.is_root) {
					$("#roots").append('<li><a target="_blank" href="#user/'+
						root.author+'">'+root.author+'</a>: <a target="_blank" href="'+
						'#forum/'+forumName+'/'+extractID(root._id)+'">'+root.title+'</a></li>');
				}
			}
		}
	});

	/*pod.query().filter( { type: "post", is_root: true } )
		.onAllResults(renderRoots).start();
	function renderRoots(roots) {
		
 	}*/
}

function extractID(_id) {
	return _id.substring(_id.lastIndexOf("/")+1);
}


function submitPost() {
	var title = $("#myThreadTitle").val();
	var text = $("#myThreadText").val();
	if (!title) {
		alert("Title must not be blank");
	} else {
		addThread(currentForumURL, title, text); //TODO: Global abatement
	}
}

function addThread(forumURL, title, text) {
	var destination = "http://"+forumURL;
	var post = {
		author: pod.getUserId().substring(7),
		title: title,
		text: text,
		parent: null,
		children: [],
		is_root: true,
		type: "post"
	}
    $.ajax({
        url: destination,
        type: "POST",
        data: JSON.stringify(post),
        contentType: "application/json",
        success: function(response, status, jqxhr){
            window.location.reload();
            /*var location = jqxhr.getResponseHeader("Location");
            parent.children.push(location);
            $.ajax({
                url: parent._id,
                type: "PUT",
                data: JSON.stringify(parent),
                contentType: "application/json",
                success: function(data) {
                    // You have to GET /_active, because for some reason the _id fields aren't inserted until you do this.
                    $.get(destination+"/_active", function(){
                        renderTree();
                    });
                }
            });*/
        }
    });
}


function getThreadPage(forumName, threadID) {
	$(".viewingForumName").text(forumName);
	currentForumURL = forumName;
	/*pod.query().filter( { type: "post", _id: "http://"+forumName+"/"+threadID } ) //TODO: Make this more robust
		.onAllResults(recordRoot).start();
	pod.query().filter( { type: "post", thread_id: threadID } )
		.onAllResults(recordReplies).start();

	var idMap = {};
	var rootDone = false;
	var repliesDone = false;

	function recordRoot(rootSingleton) {
		var root = rootSingleton[0];
		idMap[extractID(root._id)] = root;
		$(".viewingThreadTitle").text(root.title);
		rootDone = true;
		if (rootDone && repliesDone) {
			goon();
		}
	}

	function recordReplies(posts) {
		for (var i=0; i<posts.length; i++) {
			var post = posts[i];
			idMap[extractID(post._id)] = post;
		}
		repliesDone = true;
		if (rootDone && repliesDone) {
			goon();
		}
	}*/

	var idMap = {};
	$.get("http://"+forumName+"/_active", function(res) {
		var response = JSON.parse(res);
		var members = response._members;
		if (members) {
			for (var i=0; i<members.length; i++) {
				var member = members[i];
				if (member.type === "post" && (member.thread_id===threadID || extractID(member._id) === threadID) ) {
					if (member.is_root) {
						$(".viewingThreadTitle").text(member.title);
					}
					idMap[extractID(member._id)] = member;
				}
			}
			goon();
		}
	});

	function goon() {
		console.log("GOING ON!", idMap);
		renderIntoContainer(idMap[threadID], $("#threadRoot"));
	}

	function renderIntoContainer(post, $container) {
		$container.append($("<a></a>").attr({
            "class":"author",
            "href" :"#user/"+post.author,
            "target": "_blank"
        }).text(post.author))
        $container.append($("<div></div>").attr("class","content").text(post.text))
        $container.append($("<button>reply</button>").on("click", function(){
            var replyText = prompt("What do you have to say?");
            if (replyText) {
            	//alert("Make reply! "+replyText);
                postReply(post, replyText, threadID);
            }
        }));
        var children = post.children;
        for (var i=0; i<children.length; i++) {
            var child = idMap[children[i]];
            if (child) { 	
            	var $childContainer = $("<div></div>").attr("class","comment")
            	$container.append($childContainer);
            	//console.log("CHILD!", child, children[i], idMap);
            	renderIntoContainer(child, $childContainer);
            }
        }
	}
}

function postReply(parent, replyText, threadID) {
    var reply = {
    	type: "post",
        text: replyText,
        author: getMyUsername(),
        parent: extractID(parent._id),
        thread_id: threadID,
        children: []
    };
    var destination = "http://"+currentForumURL; //TODO: robustness
    $.ajax({
        url: destination,
        type: "POST",
        data: JSON.stringify(reply),
        contentType: "application/json",
        success: function(response, status, jqxhr){
            var location = jqxhr.getResponseHeader("Location");
            parent.children.push(extractID(location));
            $.ajax({
                url: parent._id,
                type: "PUT",
                data: JSON.stringify(parent),
                contentType: "application/json",
                success: function(data) {
                    // You have to GET /_active, because for some reason the _id fields aren't inserted until you do this.
                    $.get(destination+"/_active", function(){
                        window.location.reload(); // TODO: efficiency
                    });
                }
            });
        }
    });
}

function getMyUsername() {
	return pod.getUserId().substring(7);
}


function getUserPage(username) {
	$("#viewingUsername").text(username);
	$.get("http://"+username+"/_active", function(res) {
		var response = JSON.parse(res);
		var members = response._members;
		//console.log("res!!!", response);
		if (members) {
			for (var i=0; i<members.length; i++) {
				var member = members[i];
				if (member.type === "subscription") {
					var item = '<li><a target="_blank" href="#forum/'+
					member.url+'">' + member.url + '</a> <button onclick="addSubscription(this)">subscribe</button></li>';
					$("#viewingSubscriptionList").append(item);
				}
			}
		}
	});
}

function getMySubscriptions() {
	console.log("getMySubscriptions", pod.getUserId());
	pod.query().filter( { type: "subscription", _owner: pod.getUserId() } )
		.onAllResults(renderSubscriptionList).start();
	function renderSubscriptionList(subscriptions) {
		console.log("GOT MY subscriptions!");
		for (var i=0; i<subscriptions.length; i++) {
			var su = subscriptions[i];
			var item = '<li><a target="_blank" href="#forum/'+
				su.url+'">' + su.url + '</a> <button onclick="removeSubscription(this)">unsubscribe</button></li>';
			$("#mySubscriptionList").append(item);
		}
		var writein = '<li><input type="text" placeholder="subscribe to forum..."/> <button onclick="addSubscription(this)">subscribe</button></li>';
		$("#mySubscriptionList").append(writein);
	}
}

function addSubscription(button) {
	var url = $(button).closest("li").find("input").val() || $(button).closest("li").find("a").text();
	if (url) {
		pod.push({type:"subscription", url:url}, function(){
			window.location.reload(); //TODO: make this more efficient
		});
	} else {
		alert("Must not be blank");
	}
}

function removeSubscription(button) {
	var url = $(button).closest("li").find("a").text();
	alert("Unsubscribe: "+url);
}


function getMainPage() {


	pod.query().filter( { type: "subscription", _owner: pod.getUserId() } )
		.onAllResults(handleSubscriptions).start();


	function handleSubscriptions(subscriptions) {
		console.log("SSSSS!!!!", subscriptions);
		$("#feedHeading").show();
		for (var i=0; i<subscriptions.length; i++) {
			var subscription = subscriptions[i];
			getPostsFrom(subscription.url);
		}
	}

	function getPostsFrom(forumName) {
		$.get("http://"+forumName+"/_active", function(res) {
			
			var response = JSON.parse(res);
			var members = response._members;
			if (members) {
				for (var i=0; i<members.length; i++) {
					var root = members[i];
					if (root.type === "post" && root.is_root) {
						$("#feed").append('<li><a target="_blank" href="#user/'+
							root.author+'">'+root.author+'</a>: <a target="_blank" href="'+
							'#forum/'+forumName+'/'+extractID(root._id)+'">'+root.title+'</a> [<a target="_blank" href="'+
							'#forum/'+forumName+'">'+forumName+'</a>]</li>');
					}
				}
			}
		});
	}
}

