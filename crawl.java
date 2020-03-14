// https://www.tutorialspoint.com/redis/redis_java.htm
import redis.clients.jedis.Jedis;

class YoMundo {
    public static void main(String args[]) {
        System.out.println("Yo, mundo!");
        Jedis jedis = new Jedis("localhost");
        System.out.println("Server is running: "+jedis.ping());
    }
}
