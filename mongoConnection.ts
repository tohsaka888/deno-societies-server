import {
  Bson,
  MongoClient,
  Database,
  Collection,
} from "https://deno.land/x/mongo@v0.24.0/mod.ts";

// 连接和数据库操作需要异步处理
const client = new MongoClient();
await client.connect("mongodb://tohsaka888:swy156132264@81.68.113.218:27017/");

// 定义数据类型
type Article = {
  _id?: { $oid: string };
  title: string;
  tags: string[];
  intro: string;
};

type User = {
  username: string;
  password: string;
};

type UserInfo = {
  _id: Bson.ObjectId
  username: string;
  password: string;
  phone: string;
  classId: string;
  college: string;
  scoreNumber: string;
};

type CompetitionList = {
  title: string;
  tag: string[];
  intro: string;
  imgUrl: string;
};

type CompetitionUserList = {
  username: string;
  id: string;
  competition: string;
  isSignUp: boolean;
  phone: string;
  classId: string;
  college: string;
  scoreNumber: string;
};

type PageList = {
  title: string; // 比赛名称
  id: string; // 比赛唯一标识
  intro: string; // 比赛介绍
  QQ: string;
  startTime: string;
  endTime: string;  
  limitPeople: number;  // 限报人数
  way: string; // 比赛方式
  place: string; // 比赛地点
  firstPeople: number;  // 一等奖人数
  secondPeople: number; // 二等奖人数
  thirdPeople: number;  // 三等奖人数
  otherPeople: number;  // 其他人数
}

type Admin = {
  adminName: string;
  adminPass: string;
}

type AwardList = {
  username: string; // 姓名
  college: string;  // 学院
  classId: string;  // 班级
  award: string;  // 奖项
  place: string;  // 领奖地点
  time: string; // 领奖时间
  id: string; // 比赛唯一标识
}

type CompetitionImages = {
  images: Array<string>;
  id: string;
}

// 选择数据库
const db: Database = client.database("societies");

// 选择数据库中的集合
const articleCollection: Collection<Article> =
  db.collection<Article>("articles");
const userCollection: Collection<User> = db.collection<User>("userList");
const userInfoCollection: Collection<UserInfo> =
  db.collection<UserInfo>("userInfo");
const competitionListCollection: Collection<CompetitionList> =
  db.collection<CompetitionList>("competitionList");
const competitionUserListCollection: Collection<CompetitionUserList> =
  db.collection<CompetitionUserList>("competitionUserList");
const pageListCollection:Collection<PageList> = db.collection("pageList");
const adminCollection:Collection<Admin> = db.collection("admin");
const awardListCollection: Collection<AwardList> = db.collection("awardList");
const competitionImagesCollection: Collection<CompetitionImages> = db.collection("competitionImages")

// 查询操作(所有)
const searchArticle = async () => {
  return await articleCollection.find({}).toArray();
};

const searchCompetitionImages = async (id: string) => {
  return await competitionImagesCollection.find({id: id}).toArray()
}

const searchUser = async (
  username: string,
  password: string
): Promise<number | undefined> => {
  const user = await userCollection.find({}).toArray();
  let dbStatus: number | undefined = -1;
  let index = 0;
  for (const item of user) {
    if (item.username === username && item.password === password) {
      // 0登陆成功
      dbStatus = 0;
      break;
    } else {
      if (item.username === username) {
        // 1密码错误
        dbStatus = 1;
        break;
      }
      if (index === user.length - 1) {
        // 2没有注册过
        dbStatus = 2;
        break;
      }
    }
    index++;
  }
  return dbStatus;
};

const getUserInfo = async (id: string) => {
  return await userInfoCollection.find({_id: new Bson.ObjectID(id)}).toArray()
}

const getUserId = async (username: string, password: string): Promise<Bson.ObjectId> => {
  const user = await userInfoCollection.find({username: username, password: password}).toArray();
  return user[0]._id
}

// 更新操作
const updateOneArticle = async (article: Article, id?: Bson.ObjectId) => {
  await articleCollection.updateOne({ _id: id }, { $set: article });
};

// 插入操作
const insertArticle = async (
  article: Article
): Promise<Bson.Document | Error> => {
  const id: Bson.Document = await articleCollection.insertOne(article);
  return id;
};

const insertUserInfo = async (userInfo: UserInfo): Promise<string> => {
  const id: Bson.Document = await userInfoCollection.insertOne(userInfo);
  if (id) {
    return "注册成功";
  } else {
    return "注册失败";
  }
};

const insertUser = async (userInfo: UserInfo): Promise<void> => {
  await userCollection.insertOne({
    username: userInfo.username,
    password: userInfo.password,
  });
};

const getCompetitionList = async () => {
  return await competitionListCollection.find({}).limit(3).toArray();
};

const getCompetitionUserList = async () => {
  return await competitionUserListCollection.find({}).toArray();
};

const insertCompetitionUserList = async (item: CompetitionUserList): Promise<string> => {
  const id = await competitionUserListCollection.insertOne(item)
  if (id) {
    return "报名成功"
  } else {
    return "报名失败"
  }
}

const findSignUpUser = async (item: {username: string; id: string}) => {
  return await competitionUserListCollection.find(item).toArray()
}

const getCompetitionAward = async (id: string) => {
  return await awardListCollection.find({id: id}).toArray()
}

// 获取page页信息
const getPageListInfo = async (id: string) => {
  return await pageListCollection.find({id: id}).toArray();
}

// 获取管理员账户
const getAdmin = async () => {
  return await adminCollection.find({}).toArray()
}

export type { Article, User, UserInfo, CompetitionList, CompetitionUserList, Admin, Bson };
export {
  insertArticle,
  searchArticle,
  updateOneArticle,
  searchUser,
  insertUserInfo,
  insertUser,
  getCompetitionList,
  getCompetitionUserList,
  insertCompetitionUserList,
  findSignUpUser,
  getPageListInfo,
  getAdmin,
  getUserId,
  getUserInfo,
  getCompetitionAward,
  searchCompetitionImages
};
