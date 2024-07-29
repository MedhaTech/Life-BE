import Joi from 'joi';
import { constents } from '../configs/constents.config';
import { speeches } from '../configs/speeches.config';

// export const courseSchema = Joi.object().keys({
//     name: Joi.string().required().messages({
//         'string.empty': speeches.NAME_REQUIRED
//     }),
//     desc: Joi.string().required().messages({
//         'string.empty': speeches.DESCRIPTION_REQUIRED
//     }),
// });
export const teamSchema = Joi.object().keys({
    student_id: Joi.string().trim().min(1).required().messages({
        'string.empty': speeches.ID_REQUIRED
    }),
    student_name: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    student_email: Joi.string().email(),
    student_mobile: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    reg_no: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    id_card: Joi.string(),
    gender: Joi.string(),
    member_category: Joi.string(),
    dob: Joi.date(),
    age: Joi.string(),
    institution_name: Joi.string()

});
export const teamUpdateSchema = Joi.object().keys({
    status: Joi.string().trim().min(1).valid(...Object.values(constents.common_status_flags.list)).required(),
    student_name: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    student_email: Joi.string().email(),
    student_mobile: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    reg_no: Joi.string().regex(constents.ALPHA_NUMERIC_PATTERN),
    id_card: Joi.string(),
    gender: Joi.string(),
    member_category: Joi.string(),
    dob: Joi.date(),
    age: Joi.string(),
    institution_name: Joi.string()
});