var fs 				= require("fs"),
	ejs				= require("ejs"),
	tumblr			= require("tumblr.js"),
	mandrill		= require("mandrill-api/mandrill"),
	csvFile 		= process.argv[2],
	templateFile 	= process.argv[3];

function createTumblrClient() {
	return tumblr.createClient({
		consumer_key	: 'xxxxxxxxx',
		consumer_secret	: 'xxxxxxxxx',
		token 			: 'xxxxxxxxx',
		token_secret	: 'xxxxxxxxx'
	});
}

function createMandrillClient() {
	return new mandrill.Mandrill("xxxxxxxxx");
}

function csvParse(fileName) {
	var fileData 	= fs.readFileSync(fileName, "utf8"),
		records 	= fileData.split("\n"),
		titleRow 	= records.shift().split(","),
		contacts 	= [];

	records.forEach(function(row) {
		var columns   = row.split(","),
			recordObj = {}; 
		columns.forEach(function(fieldValue, index) {
			recordObj[titleRow[index]] = fieldValue.trim();
		});
		contacts.push(recordObj);
	});
	
	return contacts;
}

function sendEmail(mandrillClient, toName, toEmail, fromName, fromEmail, subject, messageHtml) {
	var message = {
		"html"					: messageHtml,
		"subject"				: subject,
		"from_name"				: fromName,
		"from_email"			: fromEmail,
		"to"					: [{
										"name"	: toName,
										"email"	: toEmail
									}],
		"important"				: false,
		"track_opens"			: true,
		"auto_html"				: false,
		"preserve_recipients"	: true,
		"merge"					: false,
		"tags"					: ["FullStack TumblrMailer Project"]
	};

	var async = true;
	mandrillClient.messages.send(
		{message:message, async:async}, 
		function(result) {
			console.log(result);
		},
		function(error) {
			console.log("A mandrill error occurred: " + error.name + " - "  + error.message);
		}
	);
}

function mailMerge(blogname, emailTemplate) {
	var tumblrClient 	= createTumblrClient(),
		mandrillClient 	= createMandrillClient(),
		contacts		= csvParse(csvFile),
		emailContent 	= fs.readFileSync(emailTemplate, "utf8"),
		recentPosts		= [],
		recentDate		= new Date().getTime() - (7 * 24 * 60 * 60 * 1000);

	tumblrClient.posts(blogname, function(error, blog) {
		
		blog.posts.forEach(function(post) {
			var blogDate = new Date(post.date).getTime();
			if (blogDate > recentDate) {
				recentPosts.push({
					title: post.title,
					url: post.short_url
				});	
			}
		});

		contacts.forEach(function(contact) {
			var obj 	= {},
				email 	= "";

			for (var key in contact) {
				obj[key] = contact[key];
			}
			obj.posts = recentPosts;
			email = ejs.render(emailContent, obj);
			sendEmail(mandrillClient, 
					  obj.firstName, 
					  obj.emailAddress, 
					  "Harish", 
					  "harishn@gmx.com", 
					  "My Recent Blogs", 
					  email);
		});
	});
}

(function() {
	mailMerge("cortadita.tumblr.com", templateFile);
})();
