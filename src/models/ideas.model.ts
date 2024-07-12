import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { constents } from '../configs/constents.config';
import db from '../utils/dbconnection.util';
import { themes_problems } from './themes_problems.model';

export class ideas extends Model<InferAttributes<ideas>, InferCreationAttributes<ideas>> {
    declare idea_id: CreationOptional<number>;
    declare financial_year_id: number;
    declare theme_problem_id: number;
    declare student_id: number;
    declare idea_title: String;
    declare solution_statement: String;
    declare detailed_solution: string;
    declare prototype_available: Enumerator;
    declare Prototype_file: String;
    declare idea_available: Enumerator;
    declare self_declaration: Enumerator;
    declare status: Enumerator;
    declare initiated_by: number;
    declare submitted_at: Date;
    declare created_by: number;
    declare created_at: Date;
    declare updated_by: number;
    declare updated_at: Date;
    declare verified_by: number;
    declare verified_at: Date;
    declare evaluated_by: String;
    declare evaluated_at: Date;
    declare evaluation_status: Enumerator;
    declare rejected_reason: String;
    declare final_result: Enumerator;
    declare district: String;
}

ideas.init(
    {
        idea_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        financial_year_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        theme_problem_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        student_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        idea_title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        solution_statement: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        detailed_solution: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        prototype_available: {
            type: DataTypes.ENUM(...Object.values(constents.common_on_off_flags.list))

        },
        Prototype_file: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        idea_available: {
            type: DataTypes.ENUM(...Object.values(constents.common_on_off_flags.list))

        },
        self_declaration: {
            type: DataTypes.ENUM(...Object.values(constents.common_on_off_flags.list))

        },
        status: {
            type: DataTypes.ENUM(...Object.values(constents.challenges_flags.list)),
            allowNull: false,
            defaultValue: constents.challenges_flags.default
        },
        initiated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        submitted_at: {
            type: DataTypes.DATE(),
            allowNull: true
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
        },
        verified_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        verified_at: {
            type: DataTypes.DATE(),
            allowNull: true
        },
        evaluated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        evaluated_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        evaluation_status: {
            type: DataTypes.ENUM(...Object.values(constents.evaluation_status.list)),
            allowNull: true
        },
        rejected_reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        final_result: {
            type: DataTypes.ENUM(...Object.values(constents.final_result_flags.list)),
            defaultValue: constents.final_result_flags.default,
            allowNull: true,
        },
        district: {
            type: DataTypes.STRING,
            allowNull: true,
        }
    },
    {
        sequelize: db,
        tableName: 'ideas',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);
ideas.belongsTo(themes_problems, { targetKey: 'theme_problem_id', foreignKey: 'theme_problem_id', constraints: false });
themes_problems.hasOne(ideas, { sourceKey: 'theme_problem_id', foreignKey: 'theme_problem_id', constraints: false });