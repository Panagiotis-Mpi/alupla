import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { approveUser, createUser, deactivateUser, listUsers, rejectUser, updateUser } from "../controllers/users.controller";

export const usersRouter = Router();

usersRouter.use(authRequired, allowRoles(["super_admin"]));

usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.put("/:id", updateUser);
usersRouter.post("/:id/approve", approveUser);
usersRouter.post("/:id/reject", rejectUser);
usersRouter.delete("/:id", deactivateUser);
