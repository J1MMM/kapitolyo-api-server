const express = require('express');
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/roles_list');
const { createClass, getClasses, archiveClass, updateClass, deleteClass } = require('../../controllers/classController');
const router = express.Router()

router.route('/')
    .get(verifyRoles(ROLES_LIST.Teacher), getClasses)
    .post(verifyRoles(ROLES_LIST.Teacher), createClass)
    .put(verifyRoles(ROLES_LIST.Teacher), updateClass)
    .patch(verifyRoles(ROLES_LIST.Teacher), archiveClass)
    .delete(verifyRoles(ROLES_LIST.Teacher), deleteClass)


module.exports = router