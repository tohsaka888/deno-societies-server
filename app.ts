import { Application, Router } from "https://deno.land/x/oak@v9.0.1/mod.ts";
import {
  create,
  verify,
  getNumericDate,
  Header,
} from "https://deno.land/x/djwt@v2.3/mod.ts";
import {
  searchArticle,
  insertArticle,
  searchUser,
  User,
  insertUserInfo,
  UserInfo,
  insertUser,
  getCompetitionList,
  getCompetitionUserList,
  insertCompetitionUserList,
  findSignUpUser,
  CompetitionUserList,
  getPageListInfo,
  Admin,
  getAdmin,
  getUserId,
  getUserInfo,
  Bson,
  getCompetitionAward,
  searchCompetitionImages
} from "./mongoConnection.ts";
import {
  WebSocketClient,
  WebSocketServer,
} from "https://deno.land/x/websocket@v0.1.1/mod.ts";

const app = new Application();
const router = new Router();

type LoginStatus = {
  token: string;
};

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

// 设置响应头 处理跨域
const responseHeader = new Headers({
  "content-type": "application/json;charset=UTF-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
});

const tokenHeader: Header = { alg: "HS512", typ: "JWT" };
const expiresDate: number = getNumericDate(60 * 60 * 24 * 15); // 设置15天后过期

console.log("博客服务已经在9000端口启用,点击访问:http://localhost:9000");

// 路由匹配
router.get("/", (ctx) => {
  ctx.response.headers = responseHeader;
  ctx.response.body = "欢迎来到博客后端系统";
});

router.post("/addArticle", async (ctx) => {
  try {
    const requestBody = await ctx.request.body().value;
    if (requestBody) {
      const id = await insertArticle(requestBody);
      ctx.response.headers = responseHeader;
      ctx.response.status = 200;
      ctx.response.body = { _id: id, message: "插入成功" };
    }
  } catch (error) {
    const errorMsg: string = error.name + error.message;
    ctx.response.status = 300;
    ctx.response.body = { error: errorMsg, message: "插入失败" };
  }
});

router.get("/getArticles", async (ctx) => {
  ctx.response.status = 200;
  ctx.response.headers = responseHeader;
  ctx.response.body = await searchArticle();
});

// 获取获奖名单
router.post("/awardList", async (ctx) => {
  try {
    const competititon = JSON.parse(await ctx.request.body().value);
    const awardList = await getCompetitionAward(competititon.id)
    ctx.response.headers = responseHeader;
    ctx.response.status = 200;
    ctx.response.body = {
      code: 200,
      awardList: awardList[0]
    }
  } catch (error) {
    const errorMsg: string = error.name + error.message;
    ctx.response.status = 300;
    ctx.response.body = { error: errorMsg, message: "插入失败" };
  }
})

// 获取比赛图片
router.post("/competitionImages", async (ctx) => {
  try {
    const competition = JSON.parse(await ctx.request.body().value);
    const images = await searchCompetitionImages(competition.id);
    ctx.response.headers = responseHeader;
    ctx.response.status = 200;
    ctx.response.body = {
      code: 200,
      images: images[0].images
    }
  } catch (error) {
    const errorMsg: string = error.name + error.message;
    ctx.response.status = 300;
    ctx.response.body = { error: errorMsg, message: "获取失败" };
  }
})

//处理登录请求
router.post("/login", async (ctx) => {
  try {
    let message: string;
    let token: string;
    let userId: Bson.ObjectId
    ctx.response.status = 200;
    const user: User = JSON.parse(await ctx.request.body().value);
    if (user) {
      const dbStatus: number | undefined = await searchUser(
        user.username,
        user.password
      );
      switch (dbStatus) {
        case 0:
          message = "登录成功";
          // 接受三个参数 Header Payload Signature
          userId = await getUserId(user.username, user.password)
          token = await create(
            tokenHeader, // 算法加密方式和类型
            { username: user.username, exp: expiresDate, userId: userId }, // token包含的数据
            key
          );
          ctx.response.status = 200;
          ctx.response.headers = responseHeader;
          ctx.response.body = {
            message: message,
            code: 200,
            token: token,
          };
          break;
        case 1:
          message = "密码错误";
          ctx.response.status = 200;
          ctx.response.headers = responseHeader;
          ctx.response.body = {
            message: message,
            code: 200,
            token: "",
          };
          break;
        case 2:
          message = "用户不存在";
          ctx.response.status = 200;
          ctx.response.headers = responseHeader;
          ctx.response.body = {
            message: message,
            code: 200,
            token: "",
          };
          break;
        default:
          message = "";
          break;
      }
    }
  } catch (error) {
    const errorMsg: string = error.name + error.message;
    ctx.response.status = 300;
    ctx.response.headers = responseHeader;
    ctx.response.body = { error: errorMsg, message: "登录失败", code: 300 };
  }
});

//获取登录状态
router.post("/login/status", async (ctx) => {
  try {
    const requestBody: LoginStatus = JSON.parse(await ctx.request.body().value);
    const token: string = requestBody.token;
    const payload = await verify(token, key);
    // 判断token是否过期
    if (payload.exp) {
      if (payload.exp > getNumericDate(new Date())) {
        ctx.response.status = 200;
        ctx.response.headers = responseHeader;
        ctx.response.body = { code: 200, username: payload.username, userId: payload.userId };
      } else {
        ctx.response.status = 200;
        ctx.response.headers = responseHeader;
        ctx.response.body = { code: 300, errmsg: "登录状态过期" };
      }
    }
  } catch (error) {
    const errorMsg: string = error.name + error.message;
    ctx.response.status = 300;
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 300, errmsg: errorMsg };
  }
});

// 登出
router.post("/logout", async (ctx) => {
  try {
    const { token } = JSON.parse(await ctx.request.body().value);
    if (token) {
      ctx.response.headers = responseHeader;
      ctx.response.body = { code: 200, message: "登出成功" };
    } else {
      ctx.response.status = 300;
      ctx.response.headers = responseHeader;
      ctx.response.body = {
        code: 300,
        errmsg: "登出失败",
      };
    }
  } catch (error) {
    ctx.response.status = 300;
    ctx.response.headers = responseHeader;
    ctx.response.body = {
      code: 300,
      errmsg: "登出失败," + error.name + error.message,
    };
  }
});

// 注册
router.post("/register", async (ctx) => {
  try {
    const userInfo: UserInfo = JSON.parse(await ctx.request.body().value);
    const message: string = await insertUserInfo(userInfo);
    insertUser(userInfo);
    ctx.response.headers = responseHeader;
    ctx.response.status = 200;
    ctx.response.body = {
      code: 200,
      message: message,
    };
  } catch (error) {
    ctx.response.status = 300;
    ctx.response.headers = responseHeader;
    ctx.response.body = {
      code: 300,
      errmsg: "注册失败," + error.name + error.message,
    };
  }
});

// 获取近期比赛列表
router.post("/competitionList", async (ctx) => {
  try {
    const competitionList = await getCompetitionList();
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 200, competitionList: competitionList };
    ctx.response.status = 200;
  } catch (error) {
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 300, errmsg: error.name + error.message };
    ctx.response.status = 300;
  }
});

// 获取报名列表
router.post("/competitionUserList", async (ctx) => {
  try {
    const competitionUserList = await getCompetitionUserList();
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 200, competitionUserList: competitionUserList };
    ctx.response.status = 200;
  } catch (error) {
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 300, errmsg: error.name + error.message };
    ctx.response.status = 300;
  }
});

// 报名比赛
router.post("/signUpCompetition", async (ctx) => {
  try {
    const item = JSON.parse(await ctx.request.body().value);
    const userInfo = await getUserInfo(item.userId)
    const message: string = await insertCompetitionUserList({
      username: userInfo[0].username,
      phone: userInfo[0].phone,
      classId: userInfo[0].classId,
      college: userInfo[0].college,
      scoreNumber: userInfo[0].scoreNumber,
      isSignUp: true,
      competition: item.competition,
      id: item.id,
    });
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 200, message: message };
    ctx.response.status = 200;
  } catch (error) {
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 300, errmsg: error.name + error.message };
    ctx.response.status = 300;
  }
});

// 查询是否已经登录
router.post("/isSignUp", async (ctx) => {
  try {
    const item = JSON.parse(await ctx.request.body().value);
    const data: CompetitionUserList[] = await findSignUpUser(item);
    ctx.response.headers = responseHeader;
    if (data.length !== 0) {
      ctx.response.body = { code: 200, message: data };
    } else {
      ctx.response.body = { code: 200, message: [{ isSignUp: false }] };
    }
    ctx.response.status = 200;
  } catch (error) {
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 300, errmsg: error.name + error.message };
    ctx.response.status = 300;
  }
});

// 路由详情接口
router.post("/pages", async (ctx) => {
  try {
    const requestBody: { id: string } = JSON.parse(
      await ctx.request.body().value
    );
    const pageList = await getPageListInfo(requestBody.id);
    if (pageList.length === 0) {
      ctx.response.headers = responseHeader;
      ctx.response.body = {
        code: 200,
        message: "数据为空",
        pageList: pageList,
      };
      ctx.response.status = 200;
    } else {
      ctx.response.headers = responseHeader;
      ctx.response.body = {
        code: 200,
        message: "请求成功",
        pageList: pageList,
      };
      ctx.response.status = 200;
    }
  } catch (error) {
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 300, errmsg: error.name + error.message };
    ctx.response.status = 300;
  }
});

// 管理员登陆
router.post("/adminLogin", async (ctx) => {
  try {
    const admin: Admin = JSON.parse(await ctx.request.body().value);
    if (admin && admin.adminName !== "" && admin.adminPass !== "") {
      const dbData: Admin[] = await getAdmin();
      if (
        dbData[0].adminName === admin.adminName &&
        dbData[0].adminPass === admin.adminPass
      ) {
        ctx.response.headers = responseHeader;
        ctx.response.body = { code: 200, message: "登陆成功" };
      } else {
        ctx.response.headers = responseHeader;
        ctx.response.body = { code: 300, message: "管理员账号密码不匹配" };
      }
    }
  } catch (error) {
    ctx.response.headers = responseHeader;
    ctx.response.body = { code: 300, errmsg: error.name + error.message };
    ctx.response.status = 300;
  }
});

// router.get('/websocket', async(ctx) => {
//   const socket = await ctx.upgrade()
//   console.log(socket.readyState)
// })

// 创建websocket连接
const wss = new WebSocketServer(9001);
wss.on("connection", function (ws: WebSocketClient) {
  ws.on("message", function (message: string) {
    ws.send(message);
  });
});

app.use(router.routes());
await app.listen({ port: 9000 });
