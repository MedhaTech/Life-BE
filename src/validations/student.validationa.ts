import Joi from 'joi';
import { constents } from '../configs/constents.config';
import { speeches } from '../configs/speeches.config';

export const studentSchema = Joi.object().keys({
    username: Joi.string().required().messages({
        'string.empty': speeches.USER_USERNAME_REQUIRED
    }),
    full_name: Joi.string().trim().min(1).regex(constents.ALPHA_NUMERIC_PATTERN).required().messages({
        'string.empty': speeches.USER_FULLNAME_REQUIRED
    }),
    role: Joi.string().required().messages({
        'string.empty': speeches.USER_ROLE_REQUIRED
    }),
    team_id: Joi.number().required().messages({
        'string.empty': speeches.USER_TEAMID_REQUIRED
    })
});

export const studentLoginSchema = Joi.object().keys({
    username: Joi.string().required().messages({
        'string.empty': speeches.USER_USERNAME_REQUIRED
    }),
    password: Joi.string().required().messages({
        'string.empty': speeches.USER_PASSWORD_REQUIRED
    })
});
export const studentChangePasswordSchema = Joi.object().keys({
    user_id: Joi.string().required().messages({
        'string.empty': speeches.USER_USERID_REQUIRED
    }),
    old_password: Joi.string().required().messages({
        'string.empty': speeches.USER_OLDPASSWORD_REQUIRED
    }),
    new_password: Joi.string().trim().min(1).required().messages({
        'string.empty': speeches.USER_NEWPASSWORD_REQUIRED
    })
});
export const studentResetPasswordSchema = Joi.object().keys({
    user_id: Joi.string().required().messages({
        'string.empty': speeches.USER_USERID_REQUIRED
    })
});

export const studentUpdateSchema = Joi.object().keys({
    status: Joi.string().valid(...Object.values(constents.common_status_flags.list)),
    institution_course_id:Joi.number(),
    year_of_study:Joi.number(),
    team_id:Joi.number().messages({
        'string.empty': speeches.USER_TEAMID_REQUIRED
    }),
    student_full_name: Joi.string().trim().min(1).regex(constents.ALPHA_NUMERIC_PATTERN),
    date_of_birth: Joi.date(),
    mobile: Joi.string().trim().regex(constents.ONLY_DIGIT_PATTERN),
    email:Joi.string(),
    Gender: Joi.string().valid(...Object.values(constents.gender_flags.list)),
    Age: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    username:Joi.string().trim().regex(constents.ONLY_DIGIT_PATTERN)
});
export const studentRegSchema = Joi.object().keys({
    status: Joi.string().valid(...Object.values(constents.common_status_flags.list)),
    institution_course_id:Joi.number(),
    year_of_study:Joi.number(),
    team_id:Joi.number().messages({
        'string.empty': speeches.USER_TEAMID_REQUIRED
    }),
    student_full_name: Joi.string().trim().min(1).regex(constents.ALPHA_NUMERIC_PATTERN),
    date_of_birth: Joi.date(),
    mobile: Joi.string().trim().regex(constents.ONLY_DIGIT_PATTERN),
    email:Joi.string(),
    Gender: Joi.string().valid(...Object.values(constents.gender_flags.list)),
    Age: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    username:Joi.string().trim().regex(constents.ONLY_DIGIT_PATTERN),
    role: Joi.string().required().regex(constents.ALPHA_NUMERIC_PATTERN).messages({
        'string.empty': speeches.USER_ROLE_REQUIRED
    }),
    mentor_id:Joi.number()
});