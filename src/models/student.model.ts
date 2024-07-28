import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import bcrypt from 'bcrypt';
import { constents } from '../configs/constents.config';
import db from '../utils/dbconnection.util';
import { baseConfig } from '../configs/base.config';
import { user } from './user.model';

export class student extends Model<InferAttributes<student>, InferCreationAttributes<student>> {
    declare student_id: CreationOptional<number>;
    declare user_id: number;
    declare student_full_name: string;
    declare date_of_birth: Date;
    declare mobile: string;
    declare email: string;
    declare Gender: string;
    declare Age: number;
    declare year_of_study: string;
    declare group: string;
    declare institution_name: string;
    declare state: string;
    declare district: string;
    declare city: string;
    declare reg_no: string;
    declare id_card: string;
    declare certificate_issued: Date;
    declare status: Enumerator;
    declare created_by: number;
    declare created_at: Date;
    declare updated_by: number;
    declare updated_at: Date;
}

student.init(
    {
        student_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        student_full_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        date_of_birth: {
            type: DataTypes.DATE,
            allowNull: true
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Gender: {
            type: DataTypes.ENUM(...Object.values(constents.gender_flags.list)),
            defaultValue: constents.gender_flags.default
        },
        Age: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        institution_name: {
            type: DataTypes.STRING
        },
        state: {
            type: DataTypes.STRING
        },
        group: {
            type: DataTypes.STRING
        },
        year_of_study: {
            type: DataTypes.STRING
        },
        district: {
            type: DataTypes.STRING
        },
        city: {
            type: DataTypes.STRING
        },
        reg_no: {
            type: DataTypes.STRING
        },
        id_card: {
            type: DataTypes.STRING
        },
        certificate_issued: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        },
        status: {
            type: DataTypes.ENUM(...Object.values(constents.common_status_flags.list)),
            defaultValue: constents.common_status_flags.default
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
            onUpdate: new Date().toLocaleString()
        }
    },
    {
        sequelize: db,
        tableName: 'students',
        timestamps: true,
        updatedAt: 'updated_at',
        createdAt: 'created_at',
        hooks: {
            beforeCreate: async (user: any) => {
                if (user.password) {
                    user.password = await bcrypt.hashSync(user.password, process.env.SALT || baseConfig.SALT);
                }
            },
            beforeUpdate: async (user) => {
                if (user.password) {
                    user.password = await bcrypt.hashSync(user.password, process.env.SALT || baseConfig.SALT);
                }
            }
        }
    }
);

student.belongsTo(user, { foreignKey: 'user_id' });
user.hasMany(student, { foreignKey: 'user_id' });
student.belongsTo(user, { foreignKey: 'user_id' });
user.hasMany(student, { foreignKey: 'user_id' });