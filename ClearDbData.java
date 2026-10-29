import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class ClearDbData {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-0-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require";
        String user = "postgres.ekkoeycylhhxykepbikl";
        String pass = "RGS-enterprises@1";

        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement()) {

            System.out.println("Connected to Supabase PostgreSQL.");
            String sql = "TRUNCATE TABLE document, salary_payment, employee, asset, expense, rent_entry, godown, activity_log RESTART IDENTITY CASCADE;";
            stmt.execute(sql);
            System.out.println(">>> SUCCESS: Cleared all business data from database while preserving admin users and schema!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
