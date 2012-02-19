/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `announcement` (
  `a_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `postDate` datetime NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`a_id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category` (
  `cat_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `private` tinyint(1) NOT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `thumb` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`cat_id`),
  KEY `name_index` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `category` VALUES (2,'general','general.png',0,'general.jpg','general_thumb.jpg'),(3,'current events','currentEvents.png',0,NULL,'currentevents_thumb.jpg'),(4,'high school','highSchool.png',0,'highschool.jpg','highschool_thumb.jpg'),(5,'college','college.png',0,'college.jpg','college_thumb.jpg'),(6,'love clinic','loveClinic.png',0,'love.jpg','love_thumb.jpg'),(7,'sports','sports.png',0,'sports.jpg','sports_thumb.jpg'),(8,'philosophy','philosophy.png',0,'philosophy.jpg','philosophy_thumb.jpg'),(9,'adulthood','adulthood.png',0,'adult.jpg','adult_thumb.jpg'),(10,'technology','technology.png',0,'tech.png','technology_thumb.jpg'),(11,'video & computer games','videoCG.png',0,NULL,'videogame_thumb.jpg'),(12,'fashion','fashion.png',0,'fashion.jpg','fashion_thumb.jpg'),(13,'tv & movies','tvMovies.png',0,'tv.jpg','tv_thumb.jpg'),(14,'music','music.png',0,'music.jpg','music_thumb.jpg'),(16,'question of the week',NULL,1,NULL,NULL);
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `conversation` (
  `d_id` int(11) NOT NULL AUTO_INCREMENT,
  `cat_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `postDate` datetime NOT NULL,
  `content` tinytext NOT NULL,
  PRIMARY KEY (`d_id`),
  KEY `cat_id_index` (`cat_id`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `response` (
  `r_id` int(11) NOT NULL AUTO_INCREMENT,
  `d_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `replyDate` datetime NOT NULL,
  `content` tinytext NOT NULL,
  PRIMARY KEY (`r_id`),
  KEY `d_id_index` (`d_id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task` (
  `task_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` varchar(255) NOT NULL,
  `done` tinyint(1) NOT NULL,
  `external_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`task_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `upvote` (
  `user_id` int(11) NOT NULL,
  `object_id` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `context_id` int(11) NOT NULL,
  KEY `user_id_index` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `avatar_image` varchar(255) DEFAULT NULL,
  `prestige` int(11) NOT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `admin` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  KEY `name_index` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_guild` (
  `user_id` int(11) NOT NULL,
  `cat_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
