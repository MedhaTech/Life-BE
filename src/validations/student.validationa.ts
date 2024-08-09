import Joi from 'joi';
import { constents } from '../configs/constents.config';
import { speeches } from '../configs/speeches.config';

export const studentSchema = Joi.object().keys({
    status: Joi.string().valid(...Object.values(constents.common_status_flags.list)),
    student_full_name: Joi.string().trim().min(1).regex(constents.ALPHA_NUMERIC_PATTERN),
    date_of_birth: Joi.date(),
    mobile: Joi.string().trim().regex(constents.ONLY_DIGIT_PATTERN),
    email: Joi.string().email(),
    Gender: Joi.string().valid(...Object.values(constents.gender_flags.list)),
    Age: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    institution_name: Joi.string().regex(constents.ALPHA_NUMERIC_PLUS_PATTERN),
    state: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    district: Joi.string().regex(constents.ALPHA_NUMERIC_PLUS_PATTERN),
    city: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    role: Joi.string().required().regex(constents.ALPHA_NUMERIC_PATTERN).messages({
        'string.empty': speeches.USER_ROLE_REQUIRED
    }),
    password: Joi.string(),
    group: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    year_of_study: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    reg_no: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    id_card:Joi.string()
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
    }),
    mobile: Joi.string().trim().regex(constents.ONLY_DIGIT_PATTERN)
});
export const studentForgotPasswordSchema = Joi.object().keys({
    email: Joi.string().email()
});

export const studentUpdateSchema = Joi.object().keys({
    status: Joi.string().valid(...Object.values(constents.common_status_flags.list)),
    student_full_name: Joi.string().trim().min(1).regex(constents.ALPHA_NUMERIC_PATTERN),
    date_of_birth: Joi.date(),
    mobile: Joi.string().trim().regex(constents.ONLY_DIGIT_PATTERN),
    email: Joi.string().email(),
    Gender: Joi.string().valid(...Object.values(constents.gender_flags.list)),
    Age: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    institution_name: Joi.string().regex(constents.ALPHA_NUMERIC_PLUS_PATTERN),
    state: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    district: Joi.string().regex(constents.ALPHA_NUMERIC_PLUS_PATTERN),
    city: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    group: Joi.string(),
    year_of_study: Joi.string(),
    reg_no: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    id_card:Joi.string()
});