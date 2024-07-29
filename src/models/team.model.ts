import { DataTypes, Model } from 'sequelize';
import db from '../utils/dbconnection.util';
import { teamAttributes } from '../interfaces/model.interface';
import { constents } from '../configs/constents.config';
import { student } from './student.model';

export class team extends Model<teamAttributes> {
    static modelTableName = "teams";
}

team.init(
    {
        team_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        student_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        student_name: {
            type: DataTypes.STRING
        },
        student_email: {
            type: DataTypes.STRING
        },
        student_mobile: {
            type: DataTypes.INTEGER
        },
        gender: {
            type: DataTypes.STRING
        },
        reg_no: {
            type: DataTypes.STRING
        },
        id_card: {
            type: DataTypes.STRING
        },
        member_category: {
            type: DataTypes.STRING
        },
        dob: {
            type: DataTypes.DATE
        },
        age: {
            type: DataTypes.STRING
        },
        institution_name: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.ENUM(...Object.values(constents.common_status_flags.list)),
            defaultValue: constents.common_status_flags.default
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
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
        tableName: team.modelTableName,
        timestamps: true,
        updatedAt: 'updated_at',
        createdAt: 'created_at',
    }
);

student.belongsTo(team, { foreignKey: 'student_id', constraints: false });
team.hasMany(student, { foreignKey: 'student_id', constraints: false });