import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createUser, deactivateUser, listUsers, updateUser } from "../controllers/users.controller";

export const usersRouter = Router();

usersRouter.use(authRequired, allowRoles(["super_admin"]));

usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.put("/:id", updateUser);
usersRouter.delete("/:id", deactivateUser);
